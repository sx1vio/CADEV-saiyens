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

// S4 de bout en bout, sur le parcours de la démo (CDC §4) : Awa pose, Moussa répond, Kwame
// vote, Awa valide, Moussa gagne ses Proof XP et reçoit une notification.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const handles = { awa: `awa-${suffix}`, moussa: `moussa-${suffix}`, kwame: `kwame-${suffix}` };

describe('répondre, voter, valider (S4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookies: Record<keyof typeof handles, string> = { awa: '', moussa: '', kwame: '' };
  let questionId: string;
  let answerId: string;

  const write = (who: keyof typeof handles, path: string, body: object = {}, key = randomUUID()) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookies[who])
      .set('Idempotency-Key', key)
      .send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    for (const who of Object.keys(handles) as Array<keyof typeof handles>) {
      cookies[who] = await signInAs(app, handles[who]);
    }
    // Kwame est un compte ancien : ses votes rapportent des XP (X2 exclut les comptes de < 24 h).
    await prisma.user.update({
      where: { handle: handles.kwame },
      data: { createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    });
    const q = await write('awa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Docker ${suffix} : le conteneur ne joint pas Postgres`,
      body: 'Connexion refusée depuis le conteneur API.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    questionId = q.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Moussa répond : 201, secrets masqués, Awa est notifiée', async () => {
    const res = await write('moussa', `/api/v1/questions/${questionId}/answers`, {
      clientId: randomUUID(),
      body: 'Remplace localhost par le nom du service. Ta chaîne postgres://app:MotDePasse42@db/app',
    }).expect(201);
    answerId = res.body.id;
    expect(res.body).toMatchObject({ questionId, isAccepted: false, secretsMasked: 1 });
    expect(res.body.body).not.toContain('MotDePasse42');

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Cookie', cookies.awa)
      .expect(200);
    expect(inbox.body.unreadCount).toBe(1);
    expect(inbox.body.data[0]).toMatchObject({
      type: 'answer.created',
      payload: { questionId, answerId, by: handles.moussa },
      readAt: null,
    });

    await write('awa', '/api/v1/notifications/read', { all: true }).expect(200);
    const after = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Cookie', cookies.awa)
      .expect(200);
    expect(after.body.unreadCount).toBe(0);
  });

  it('répondre à une question inconnue : 404', async () => {
    await write('moussa', `/api/v1/questions/${randomUUID()}/answers`, {
      clientId: randomUUID(),
      body: 'b',
    }).expect(404);
  });

  it('Moussa ne peut pas voter pour sa propre réponse : 403 xp.self_vote', async () => {
    const res = await write('moussa', `/api/v1/answers/${answerId}/vote`).expect(403);
    expect(res.body.code).toBe('xp.self_vote');
  });

  it('Kwame vote : +2 XP à Moussa ; voter une seconde fois ne compte pas', async () => {
    const first = await write('kwame', `/api/v1/answers/${answerId}/vote`).expect(200);
    expect(first.body).toMatchObject({ counted: true, helpfulCount: 1 });
    expect(first.body.xp.granted).toEqual([
      { handle: handles.moussa, kind: 'answer_helpful_vote', points: 2 },
    ]);
    const again = await write('kwame', `/api/v1/answers/${answerId}/vote`).expect(200);
    expect(again.body).toMatchObject({ counted: false, helpfulCount: 1, xp: { granted: [] } });
  });

  it('seule Awa peut valider : 403 pour Moussa', async () => {
    const res = await write('moussa', `/api/v1/answers/${answerId}/accept`).expect(403);
    expect(res.body.code).toBe('forbidden');
  });

  it('Awa valide : question résolue, +10 et +3 (moins de 15 min) à Moussa, +1 à Awa', async () => {
    const key = randomUUID();
    const res = await write('awa', `/api/v1/answers/${answerId}/accept`, {}, key).expect(200);
    expect(res.body).toMatchObject({ questionId, answerId, status: 'resolved' });
    expect(res.body.xp.granted).toEqual(
      expect.arrayContaining([
        { handle: handles.moussa, kind: 'answer_accepted', points: 10 },
        { handle: handles.moussa, kind: 'answer_fast_bonus', points: 3 },
        { handle: handles.awa, kind: 'question_resolved', points: 1 },
      ]),
    );

    // Rejeu de la même clé : même réponse, aucun XP en plus.
    const replay = await write('awa', `/api/v1/answers/${answerId}/accept`, {}, key).expect(200);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body).toEqual(res.body);
    const moussa = await prisma.user.findUniqueOrThrow({ where: { handle: handles.moussa } });
    const xp = await prisma.xpEvent.aggregate({
      where: { userId: moussa.id },
      _sum: { points: true },
    });
    expect(xp._sum.points).toBe(15);

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Cookie', cookies.moussa)
      .expect(200);
    expect(inbox.body.data[0]).toMatchObject({
      type: 'answer.accepted',
      payload: { questionId, answerId, points: 13 },
    });
  });

  it('valider une autre réponse ensuite : 409 question.already_resolved', async () => {
    const other = await write('kwame', `/api/v1/questions/${questionId}/answers`, {
      clientId: randomUUID(),
      body: 'Autre piste',
    }).expect(201);
    const res = await write('awa', `/api/v1/answers/${other.body.id}/accept`).expect(409);
    expect(res.body.code).toBe('question.already_resolved');
  });

  it('la fiche publique montre la réponse validée en premier', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/questions/${questionId}`)
      .expect(200);
    expect(res.body).toMatchObject({ status: 'resolved', acceptedAnswerId: answerId });
    expect(res.body.answers[0]).toMatchObject({ id: answerId, isAccepted: true, helpfulCount: 1 });
    expect(res.body.answerCount).toBe(2);
  });
});
