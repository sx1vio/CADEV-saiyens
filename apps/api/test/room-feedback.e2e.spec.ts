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

// R6 de bout en bout : demande d'un membre, notification des autres membres, flux de la stack,
// prise par un dev extérieur, confirmation par le demandeur et +8 XP au relecteur.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const owner = `awa-review-${suffix}`;
// Faux jeton construit à l'exécution : rien qui ressemble à un secret dans le dépôt (gitleaks).
const token = 'ghp_' + 'a'.repeat(36);

describe('demander un retour ou une revue de code (R6)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie = new Map<string, string>();
  const handle = {
    awa: owner,
    moussa: `moussa-review-${suffix}`,
    kwame: `kwame-review-${suffix}`,
  };
  let roomId: string;
  let reviewId: string;
  const slug = `review-${suffix}`;

  const post = (who: keyof typeof handle, path: string, body: object = {}) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get(who)!)
      .set('Idempotency-Key', randomUUID())
      .send(body);
  const get = (path: string, who?: keyof typeof handle) => {
    const r = request(app.getHttpServer()).get(path);
    return who ? r.set('Cookie', cookie.get(who)!) : r;
  };
  const userId = async (who: keyof typeof handle) =>
    (await prisma.user.findUniqueOrThrow({ where: { handle: handle[who] } })).id;
  const notifications = async (who: keyof typeof handle, type: string) =>
    prisma.notification.findMany({ where: { userId: await userId(who), type } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug, label: `Review ${suffix}` }]);
    for (const [who, login] of Object.entries(handle)) cookie.set(who, await signInAs(app, login));
    const room = await post('awa', '/api/v1/rooms', {
      name: `Kora ${suffix}`,
      description: 'Carnet de commandes pour les couturiers.',
      stackTagSlugs: [slug],
    }).expect(201);
    roomId = room.body.id;
    const req = await post('moussa', `/api/v1/rooms/${roomId}/join`).expect(201);
    await post('awa', `/api/v1/join-requests/${req.body.id}/decide`, { decision: 'accept' }).expect(
      200,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('demander une revue : membres seulement ; les autres membres sont notifiés', async () => {
    const res = await post('awa', `/api/v1/rooms/${roomId}/feedback-requests`, {
      kind: 'code_review',
      url: 'https://github.com/awa/kora/pull/12',
      note: `Surtout la gestion des erreurs, token=${token}`,
    }).expect(201);
    reviewId = res.body.id;
    expect(res.body).toMatchObject({
      kind: 'code_review',
      status: 'open',
      url: 'https://github.com/awa/kora/pull/12',
      room: { id: roomId, name: `Kora ${suffix}` },
      requester: { handle: handle.awa },
      reviewer: null,
      stack: [{ slug }],
    });
    // Secrets masqués avant l'enregistrement (§10).
    expect(res.body.note).not.toContain(token);

    const notified = await notifications('moussa', 'feedback.requested');
    expect(notified).toHaveLength(1);
    expect(notified[0]!.payload).toMatchObject({
      feedbackRequestId: reviewId,
      kind: 'code_review',
    });
    expect(await notifications('awa', 'feedback.requested')).toHaveLength(0);

    const no = await post('kwame', `/api/v1/rooms/${roomId}/feedback-requests`, {
      kind: 'feedback',
    }).expect(403);
    expect(no.body.code).toBe('room.not_member');
  });

  it('une seule demande en cours du même type ; lien http refusé', async () => {
    const dup = await post('awa', `/api/v1/rooms/${roomId}/feedback-requests`, {
      kind: 'code_review',
    }).expect(409);
    expect(dup.body.code).toBe('feedback.already_open');
    await post('awa', `/api/v1/rooms/${roomId}/feedback-requests`, {
      kind: 'feedback',
      url: 'http://example.com',
    }).expect(400);
  });

  it('visible dans le flux de la stack, filtré par étiquette', async () => {
    const feed = await get(`/api/v1/feedback-requests?tags=${slug}`).expect(200);
    expect(feed.body.data.map((f: { id: string }) => f.id)).toEqual([reviewId]);
    const other = await get('/api/v1/feedback-requests?tags=inconnue-xyz').expect(200);
    expect(other.body.data).toHaveLength(0);
    const room = await get(`/api/v1/rooms/${roomId}/feedback-requests`).expect(200);
    expect(room.body.data).toHaveLength(1);
  });

  it('prendre : pas sa propre demande ; un dev extérieur peut ; le demandeur est notifié', async () => {
    const self = await post('awa', `/api/v1/feedback-requests/${reviewId}/take`).expect(403);
    expect(self.body.code).toBe('feedback.self_review');
    const taken = await post('kwame', `/api/v1/feedback-requests/${reviewId}/take`).expect(200);
    expect(taken.body).toMatchObject({ status: 'in_progress', reviewer: { handle: handle.kwame } });
    // La reprendre soi-même ne change rien ; un autre ne peut plus.
    await post('kwame', `/api/v1/feedback-requests/${reviewId}/take`).expect(200);
    const busy = await post('moussa', `/api/v1/feedback-requests/${reviewId}/take`).expect(409);
    expect(busy.body.code).toBe('feedback.already_taken');
    expect(await notifications('awa', 'feedback.taken')).toHaveLength(1);
    // Une demande prise quitte le flux.
    const feed = await get(`/api/v1/feedback-requests?tags=${slug}`).expect(200);
    expect(feed.body.data).toHaveLength(0);
  });

  it('confirmer : le demandeur seulement ; +8 XP au relecteur, une seule fois', async () => {
    const no = await post('kwame', `/api/v1/feedback-requests/${reviewId}/confirm`).expect(403);
    expect(no.body.code).toBe('forbidden');
    const ok = await post('awa', `/api/v1/feedback-requests/${reviewId}/confirm`).expect(200);
    expect(ok.body).toMatchObject({ points: 8, request: { status: 'done' } });
    expect(ok.body.request.confirmedAt).not.toBeNull();
    const again = await post('awa', `/api/v1/feedback-requests/${reviewId}/confirm`).expect(409);
    expect(again.body.code).toBe('feedback.invalid_status');

    const xp = await prisma.xpEvent.findMany({
      where: { userId: await userId('kwame'), kind: 'code_review_given' },
    });
    expect(xp.reduce((s, e) => s + e.points, 0)).toBe(8);
    const confirmed = await notifications('kwame', 'feedback.confirmed');
    expect(confirmed[0]!.payload).toMatchObject({ points: 8 });
  });

  it('un retour simple ne rapporte pas de Proof XP ; le demandeur peut annuler', async () => {
    const fb = await post('moussa', `/api/v1/rooms/${roomId}/feedback-requests`, {
      kind: 'feedback',
    }).expect(201);
    await post('kwame', `/api/v1/feedback-requests/${fb.body.id}/take`).expect(200);
    const ok = await post('moussa', `/api/v1/feedback-requests/${fb.body.id}/confirm`).expect(200);
    expect(ok.body.points).toBe(0);

    const other = await post('moussa', `/api/v1/rooms/${roomId}/feedback-requests`, {
      kind: 'feedback',
    }).expect(201);
    expect(
      (await post('awa', `/api/v1/feedback-requests/${other.body.id}/cancel`).expect(403)).body
        .code,
    ).toBe('forbidden');
    const cancelled = await post('moussa', `/api/v1/feedback-requests/${other.body.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('cancelled');
    const room = await get(`/api/v1/rooms/${roomId}/feedback-requests`).expect(200);
    expect(room.body.data.map((f: { id: string }) => f.id)).not.toContain(other.body.id);
  });
});
