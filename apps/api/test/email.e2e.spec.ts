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
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// Y3 de bout en bout, avec une messagerie capturée : Awa reçoit un récapitulatif de la réponse
// de Moussa restée non lue, puis se désabonne en un clic.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');

describe('e-mail récapitulatif des notifications (Y3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let job: EmailDigestJob;
  const sent: MailMessage[] = [];
  let failNext = false;
  const cookie = new Map<string, string>();
  const handle = (n: string) => `${n}-mail-${suffix}`;
  let awaId: string;

  const post = (who: string, path: string, body: object) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get(who)!)
      .set('Idempotency-Key', randomUUID())
      .send(body);

  /** Avance l'horloge du job : les notifications d'Awa ont plus de 2 minutes. */
  const runLater = () => job.run(new Date(Date.now() + 3 * 60_000));
  const awaMails = () => sent.filter((m) => m.to === `awa-${suffix}@example.test`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER)
      .useValue({
        configured: true,
        send: async (m: MailMessage) => {
          // Base partagée avec les autres fichiers : la panne ne vise que l'e-mail d'Awa.
          if (failNext && m.to === `awa-${suffix}@example.test`) {
            failNext = false;
            throw new Error('SMTP injoignable');
          }
          sent.push(m);
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    job = app.get(EmailDigestJob);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    for (const n of ['awa', 'moussa']) cookie.set(n, await signInAs(app, handle(n)));
    const awa = await prisma.user.update({
      where: { handle: handle('awa') },
      data: { email: `awa-${suffix}@example.test`, displayName: 'Awa Koné' },
    });
    awaId = awa.id;
    const q = await post('awa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `E-mail ${suffix} : le build Docker échoue`,
      body: 'COPY ne trouve pas le fichier.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    await post('moussa', `/api/v1/questions/${q.body.id}/answers`, {
      clientId: randomUUID(),
      body: 'Vérifie le contexte de build.',
    }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rien avant 2 minutes ; ensuite un e-mail, une seule fois ; un échec SMTP réessaie', async () => {
    await job.run();
    expect(awaMails()).toHaveLength(0);

    failNext = true;
    await runLater();
    expect(awaMails()).toHaveLength(0);
    const pending = await prisma.notification.count({
      where: { userId: awaId, emailSentAt: null },
    });
    expect(pending).toBeGreaterThan(0); // libérées pour le passage suivant

    await runLater();
    expect(awaMails()).toHaveLength(1);
    const mail = awaMails()[0]!;
    expect(mail.subject).toContain('a répondu à « E-mail');
    expect(mail.text).toContain('Bonjour Awa Koné,');
    expect(mail.unsubscribeUrl).toMatch(/\/api\/v1\/unsubscribe\?token=/);
    await runLater();
    expect(awaMails()).toHaveLength(1);
  });

  it('désabonnement en un clic (lien et bouton du client mail), sans session ; jeton modifié refusé', async () => {
    const url = new URL(awaMails()[0]!.unsubscribeUrl!);
    const token = url.searchParams.get('token')!;
    await request(app.getHttpServer()).get(`/api/v1/unsubscribe?token=${token}x`).expect(400);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/unsubscribe?token=${token}`)
      .expect(200);
    expect(res.text).toContain('Tu ne recevras plus ces e-mails');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: awaId } })).emailNotifications).toBe(
      false,
    );
    // RFC 8058 : POST sans Origin ni X-DevHub-Client.
    await request(app.getHttpServer())
      .post(`/api/v1/unsubscribe?token=${token}`)
      .expect(200, { unsubscribed: true });

    // Plus d'e-mail après désabonnement, même pour une nouvelle notification.
    await prisma.notification.create({
      data: {
        userId: awaId,
        type: 'answer.created',
        payload: { questionId: randomUUID(), title: 'x' },
      },
    });
    await runLater();
    expect(awaMails()).toHaveLength(1);

    // Réactivation depuis les réglages.
    const me = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get('awa')!)
      .set('Idempotency-Key', randomUUID())
      .send({ emailNotifications: true })
      .expect(200);
    expect(me.body.emailNotifications).toBe(true);
  });
});
