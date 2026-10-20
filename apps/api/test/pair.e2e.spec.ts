import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// S5 de bout en bout : Moussa propose un créneau à Awa, qui l'accepte. Le lien de visio n'est
// visible que d'eux deux ; Kwame, connecté mais tiers, ne voit rien.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const handles = {
  awa: `awa-pair-${suffix}`,
  moussa: `moussa-pair-${suffix}`,
  kwame: `kwame-pair-${suffix}`,
};
type Who = keyof typeof handles;
const link = `https://meet.jit.si/devhub-${suffix}`;
const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe('créneau de pair programming (S5)', () => {
  let app: INestApplication;
  const cookies: Record<Who, string> = { awa: '', moussa: '', kwame: '' };
  let questionId: string;
  let pairId: string;

  const write = (who: Who, path: string, body: object = {}, key = randomUUID()) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookies[who])
      .set('Idempotency-Key', key)
      .send(body);
  const read = (who: Who, path: string) =>
    request(app.getHttpServer()).get(path).set('Cookie', cookies[who]);
  const sessions = (who: Who) => read(who, `/api/v1/questions/${questionId}/pair-sessions`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    await ensureTags(app.get(PrismaService), [{ slug: 'docker', label: 'Docker' }]);
    for (const who of Object.keys(handles) as Who[]) {
      cookies[who] = await signInAs(app, handles[who]);
    }
    const q = await write('awa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Pair ${suffix} : le conteneur ne joint pas Postgres`,
      body: 'Connexion refusée depuis le conteneur API.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    questionId = q.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Moussa propose : 201, Awa est notifiée ; rejouer la même clé ne crée rien', async () => {
    const key = randomUUID();
    const body = { startsAt: inHours(3), videoLink: link };
    const res = await write('moussa', `/api/v1/questions/${questionId}/pair`, body, key).expect(
      201,
    );
    pairId = res.body.id;
    expect(res.body).toMatchObject({
      questionId,
      status: 'proposed',
      videoLink: link,
      host: { handle: handles.moussa },
      guest: { handle: handles.awa },
    });
    expect(res.body.host).not.toHaveProperty('id');

    const replay = await write('moussa', `/api/v1/questions/${questionId}/pair`, body, key).expect(
      201,
    );
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body.id).toBe(pairId);

    const inbox = await read('awa', '/api/v1/notifications').expect(200);
    expect(inbox.body.data).toContainEqual(
      expect.objectContaining({
        type: 'pair.proposed',
        payload: expect.objectContaining({ questionId, pairId, by: handles.moussa }),
      }),
    );
  });

  it('créneau et lien visibles des deux parties seulement', async () => {
    for (const who of ['awa', 'moussa'] as const) {
      const res = await sessions(who).expect(200);
      expect(res.body.data).toEqual([expect.objectContaining({ id: pairId, videoLink: link })]);
    }
    expect((await sessions('kwame').expect(200)).body.data).toEqual([]);
    await request(app.getHttpServer())
      .get(`/api/v1/questions/${questionId}/pair-sessions`)
      .expect(401);
    // La fiche publique de la question n'expose aucun lien.
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/questions/${questionId}`)
      .expect(200);
    expect(JSON.stringify(detail.body)).not.toContain(link);
  });

  it('refus : sa propre question, lien inconnu, créneau passé, doublon en attente', async () => {
    const post = (who: Who, body: object) =>
      write(who, `/api/v1/questions/${questionId}/pair`, body);
    const own = await post('awa', { startsAt: inHours(3), videoLink: link }).expect(422);
    expect(own.body.code).toBe('pair.own_question');
    const bad = await post('kwame', {
      startsAt: inHours(3),
      videoLink: 'https://evil.example/meet',
    }).expect(422);
    expect(bad.body.code).toBe('pair.video_link_rejected');
    const past = await post('kwame', { startsAt: inHours(-2), videoLink: link }).expect(422);
    expect(past.body.code).toBe('pair.invalid_slot');
    const twice = await post('moussa', { startsAt: inHours(5), videoLink: link }).expect(409);
    expect(twice.body.code).toBe('pair.already_proposed');
  });

  it('seule Awa répond ; elle accepte, Moussa est notifié ; une seconde réponse est refusée', async () => {
    const path = `/api/v1/pair-sessions/${pairId}/respond`;
    const forbidden = await write('kwame', path, { accept: true }).expect(403);
    expect(forbidden.body.code).toBe('forbidden');

    const res = await write('awa', path, { accept: true }).expect(200);
    expect(res.body).toMatchObject({ id: pairId, status: 'accepted' });

    const inbox = await read('moussa', '/api/v1/notifications').expect(200);
    expect(inbox.body.data).toContainEqual(
      expect.objectContaining({
        type: 'pair.answered',
        payload: expect.objectContaining({ pairId, decision: 'accepted', by: handles.awa }),
      }),
    );

    const again = await write('awa', path, { accept: false }).expect(409);
    expect(again.body.code).toBe('pair.already_answered');
    await write('awa', `/api/v1/pair-sessions/${randomUUID()}/respond`, { accept: true }).expect(
      404,
    );
  });

  it('après un refus : 409 pendant 24 h, puis la proposition repasse ; question masquée : 404', async () => {
    const prisma = app.get(PrismaService);
    const propose = () =>
      write('kwame', `/api/v1/questions/${questionId}/pair`, {
        startsAt: inHours(6),
        videoLink: link,
      });
    const first = await propose().expect(201);
    await write('awa', `/api/v1/pair-sessions/${first.body.id}/respond`, {
      accept: false,
    }).expect(200);

    const again = await propose().expect(409);
    expect(again.body.code).toBe('pair.recently_declined');

    // Le refus date de plus de 24 h : Kwame peut reproposer.
    await prisma.pairSession.update({
      where: { id: first.body.id },
      data: { respondedAt: new Date(Date.now() - 25 * 3600_000) },
    });
    const later = await propose().expect(201);

    // La modération masque la question : la proposition en attente ne reçoit plus de réponse.
    await prisma.question.update({ where: { id: questionId }, data: { hiddenAt: new Date() } });
    await write('awa', `/api/v1/pair-sessions/${later.body.id}/respond`, {
      accept: true,
    }).expect(404);
  });
});
