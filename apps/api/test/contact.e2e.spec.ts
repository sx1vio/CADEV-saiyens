import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { MAILER, type MailMessage } from '../src/modules/notifications/infrastructure/mailer';
import { EmailDigestJob } from '../src/modules/notifications/jobs/email-digest.job';
import { CONTACTS_PER_DAY } from '../src/modules/passport/domain/contact';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// PR4 de bout en bout : Awa se déclare « Disponible pour une mission », Moussa la trouve dans
// Découvrir et lui écrit depuis son Passport. Le message arrive en notification, puis dans le
// récapitulatif e-mail d'Awa (Y3), sans qu'aucune adresse ne soit montrée.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');

describe('« Disponible pour une mission » et Contacter (PR4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let job: EmailDigestJob;
  const sent: MailMessage[] = [];
  const cookie = new Map<string, string>();
  const handle = (n: string) => `${n}-pr4-${suffix}`;
  const awaEmail = `awa-${suffix}@example.test`;
  const moussaEmail = `moussa-${suffix}@example.test`;

  const contact = (who: string | null, to: string, message: string) => {
    const req = request(app.getHttpServer())
      .post(`/api/v1/u/${to}/contact`)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID());
    if (who) req.set('Cookie', cookie.get(who)!);
    return req.send({ message });
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER)
      .useValue({ configured: true, send: async (m: MailMessage) => void sent.push(m) })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    job = app.get(EmailDigestJob);
    for (const n of ['awa', 'moussa', 'kwame']) cookie.set(n, await signInAs(app, handle(n)));
    await prisma.user.update({ where: { handle: handle('awa') }, data: { email: awaEmail } });
    await prisma.user.update({ where: { handle: handle('moussa') }, data: { email: moussaEmail } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('le drapeau mission passe par PATCH /me, le Passport et le filtre de Découvrir', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get('awa')!)
      .set('Idempotency-Key', randomUUID())
      .send({ availability: { now: false, mission: true } })
      .expect(200);

    const passport = await request(app.getHttpServer())
      .get(`/api/v1/u/${handle('awa')}`)
      .expect(200);
    expect(passport.body.user.availability).toMatchObject({ mission: true });

    const found = await request(app.getHttpServer())
      .get('/api/v1/discover/devs')
      .query({ mission: 'true', limit: 50 })
      .expect(200);
    const cards = found.body.data as Array<{ handle: string; availableForMission: boolean }>;
    expect(cards.map((c) => c.handle)).toContain(handle('awa'));
    expect(cards.map((c) => c.handle)).not.toContain(handle('moussa'));
    expect(cards.every((c) => c.availableForMission)).toBe(true);

    // PR14 : masquer ses disponibilités retire aussi le drapeau mission.
    await prisma.user.update({
      where: { handle: handle('awa') },
      data: { privacy: { hideAvailability: true } },
    });
    const hidden = await request(app.getHttpServer())
      .get('/api/v1/discover/devs')
      .query({ mission: 'true', limit: 50 })
      .expect(200);
    expect(hidden.body.data.map((c: { handle: string }) => c.handle)).not.toContain(handle('awa'));
    await prisma.user.update({ where: { handle: handle('awa') }, data: { privacy: {} } });
  });

  it('Moussa écrit à Awa : une notification avec le message, aucune adresse', async () => {
    const message = `Bonjour Awa, une mission React à Dakar ${suffix} t'intéresse ?`;
    const res = await contact('moussa', handle('awa'), message).expect(201);
    expect(res.body.sentAt).toEqual(expect.any(String));

    const list = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Cookie', cookie.get('awa')!)
      .expect(200);
    const n = list.body.data.find((x: { type: string }) => x.type === 'contact.request');
    expect(n.payload).toMatchObject({ by: handle('moussa'), message });
    expect(JSON.stringify(list.body)).not.toContain(moussaEmail);
  });

  it('refus : sans session, à soi-même, compte inconnu, message trop court', async () => {
    await contact(null, handle('awa'), 'Bonjour, une mission ?').expect(401);
    const self = await contact('awa', handle('awa'), 'Bonjour, une mission ?').expect(422);
    expect(self.body.code).toBe('unprocessable');
    await contact('awa', `inconnu-${suffix}`, 'Bonjour, une mission ?').expect(404);
    await contact('awa', handle('moussa'), 'Salut').expect(400);
  });

  it(`au plus ${CONTACTS_PER_DAY} messages par jour et par expéditeur`, async () => {
    for (let i = 0; i < CONTACTS_PER_DAY; i++) {
      await contact('kwame', handle('awa'), `Message numéro ${i} de Kwame`).expect(201);
    }
    const res = await contact('kwame', handle('moussa'), 'Un message de trop').expect(429);
    expect(res.body.code).toBe('rate_limited');
    expect(res.body.retryAfter).toBeGreaterThan(0);
  });

  it('le récapitulatif e-mail relaie le message, sans l’adresse de l’expéditeur', async () => {
    await job.run(new Date(Date.now() + 3 * 60_000));
    const mail = sent.find((m) => m.to === awaEmail);
    expect(mail).toBeDefined();
    expect(mail!.text).toContain(`une mission React à Dakar ${suffix}`);
    expect(mail!.text).toContain(`/u/${handle('moussa')}`);
    expect(mail!.text).not.toContain(moussaEmail);
    expect(mail!.html).not.toContain(moussaEmail);
  });
});
