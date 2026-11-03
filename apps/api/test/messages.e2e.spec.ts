import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ADMIN_HEADERS, adminSignIn, makeAdmin } from './admin.helper';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// Messagerie privée entre membres : conversation, temps réel, non-lus, blocage, signalement.
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  ADMIN_URL: 'http://localhost:5299',
});

const s = randomBytes(4).toString('hex');
const A = `ama-dm-${s}`;
const B = `bio-dm-${s}`;
const C = `cyr-dm-${s}`;

describe('messagerie privée', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie = new Map<string, string>();
  let adm: string;
  let convId: string;
  let firstMessageId: string;
  const http = () => request(app.getHttpServer());
  const get = (who: string, path: string) => http().get(path).set('Cookie', cookie.get(who)!);
  const post = (who: string, path: string, body: object = {}) =>
    http()
      .post(path)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', cookie.get(who)!)
      .send(body);
  const del = (who: string, path: string) =>
    http().delete(path).set(WRITE_HEADERS).set('Cookie', cookie.get(who)!);
  const send = (who: string, body: string, clientId = randomUUID()) =>
    post(who, `/api/v1/conversations/${convId}/messages`, { body, clientId });
  const notifs = async (handle: string) =>
    prisma.notification.count({ where: { user: { handle }, type: 'message.received' } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    for (const h of [A, B, C]) cookie.set(h, await signInAs(app, h));
    const admHandle = `adm-dm-${s}`;
    await signInAs(app, admHandle);
    adm = await adminSignIn(app, await makeAdmin(prisma, admHandle));
  });

  afterAll(async () => {
    await prisma.conversation.deleteMany({ where: { members: { some: { user: { handle: A } } } } });
    await app.close();
  });

  it('ouvre une seule conversation par paire, refuse soi-même et un inconnu', async () => {
    await http().get('/api/v1/conversations').expect(401);
    const first = await post(A, '/api/v1/conversations', { handle: B }).expect(201);
    convId = first.body.id;
    expect((await post(A, '/api/v1/conversations', { handle: `@${B}` }).expect(201)).body.id).toBe(
      convId,
    );
    expect((await post(B, '/api/v1/conversations', { handle: A }).expect(201)).body.id).toBe(
      convId,
    );
    expect((await post(A, '/api/v1/conversations', { handle: A }).expect(422)).body.code).toBe(
      'message.self',
    );
    await post(A, '/api/v1/conversations', { handle: `personne-${s}` }).expect(404);
    // Conversation vide : pas encore dans la liste.
    expect((await get(A, '/api/v1/conversations').expect(200)).body.data).toHaveLength(0);
  });

  it('envoi, non-lus, une notification par série, lecture', async () => {
    const m1 = await send(
      A,
      'Salut ! J’ai vu ton projet Flutter, tu cherches encore quelqu’un ?',
    ).expect(201);
    firstMessageId = m1.body.id;
    expect(m1.body).toMatchObject({ mine: true, hidden: false });
    await send(A, 'Je peux aider sur la partie paiement mobile money.').expect(201);
    expect(await notifs(B)).toBe(1); // deux messages, une seule notification

    const list = await get(B, '/api/v1/conversations').expect(200);
    expect(list.body.unreadTotal).toBe(2);
    expect(list.body.data[0]).toMatchObject({
      id: convId,
      unread: 2,
      canWrite: true,
      peer: { handle: A, active: true },
      lastMessage: { mine: false },
    });

    const thread = await get(B, `/api/v1/conversations/${convId}/messages`).expect(200);
    expect(thread.body.data.map((m: { body: string }) => m.body)).toEqual([
      'Salut ! J’ai vu ton projet Flutter, tu cherches encore quelqu’un ?',
      'Je peux aider sur la partie paiement mobile money.',
    ]);
    expect(thread.body.data[0].mine).toBe(false);
    await post(B, `/api/v1/conversations/${convId}/read`).expect(204);
    expect((await get(B, '/api/v1/conversations').expect(200)).body.unreadTotal).toBe(0);

    await send(B, 'Oui, avec plaisir. On s’appelle demain ?').expect(201);
    expect(await notifs(A)).toBe(1);
    await send(A, 'Parfait.').expect(201);
    expect(await notifs(B)).toBe(2); // B avait tout lu : nouvelle série, nouvelle notification
  });

  it('un même clientId ne duplique pas le message', async () => {
    const clientId = randomUUID();
    const a = await send(A, 'Renvoyé deux fois', clientId).expect(201);
    const b = await send(A, 'Renvoyé deux fois', clientId).expect(201);
    expect(b.body.id).toBe(a.body.id);
    expect(await prisma.directMessage.count({ where: { clientId } })).toBe(1);
  });

  it('reste privée : ni lecture, ni écriture, ni flux temps réel pour un tiers', async () => {
    await get(C, `/api/v1/conversations/${convId}/messages`).expect(404);
    await send(C, 'intrus').expect(404);
    await post(C, `/api/v1/conversations/${convId}/read`).expect(404);
    await get(C, `/api/v1/events?topics=dm:${convId}`).expect(403);
  });

  it('blocage : plus aucun message, dans un sens comme dans l’autre', async () => {
    await post(B, `/api/v1/users/${A}/block`).expect(204);
    expect((await send(A, 'Tu es là ?').expect(403)).body.code).toBe('message.unavailable');
    await send(B, 'Je ne peux plus écrire non plus').expect(403);
    const aView = (await get(A, '/api/v1/conversations').expect(200)).body.data[0];
    const bView = (await get(B, '/api/v1/conversations').expect(200)).body.data[0];
    expect(aView).toMatchObject({ canWrite: false, blocked: false });
    expect(bView).toMatchObject({ canWrite: false, blocked: true });
    await post(C, '/api/v1/conversations', { handle: B }).expect(201); // C n'est pas concerné
    await del(B, `/api/v1/users/${A}/block`).expect(204);
    await send(A, 'Merci de m’avoir débloqué.').expect(201);
  });

  it('signalement par un membre seulement, puis masqué par la modération', async () => {
    await post(C, '/api/v1/reports', {
      targetType: 'direct_message',
      targetId: firstMessageId,
      reason: 'Démarchage',
    }).expect(422);
    const rep = await post(B, '/api/v1/reports', {
      targetType: 'direct_message',
      targetId: firstMessageId,
      reason: 'Démarchage insistant',
    }).expect(201);
    await http()
      .post(`/api/v1/admin/reports/${rep.body.id}/action`)
      .set(ADMIN_HEADERS)
      .set('Cookie', adm)
      .set('Idempotency-Key', randomUUID())
      .send({ action: 'hide', reason: 'Démarchage' })
      .expect(200);
    const thread = await get(A, `/api/v1/conversations/${convId}/messages`).expect(200);
    expect(thread.body.data[0]).toMatchObject({ id: firstMessageId, hidden: true, body: '' });
  });

  it('un compte suspendu ne reçoit plus de messages', async () => {
    await prisma.user.update({ where: { handle: B }, data: { suspendedAt: new Date() } });
    await send(A, 'Toujours là ?').expect(403);
    expect((await get(A, '/api/v1/conversations').expect(200)).body.data[0].peer.active).toBe(
      false,
    );
    await prisma.user.update({ where: { handle: B }, data: { suspendedAt: null } });
  });
});
