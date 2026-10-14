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

// R1, R3, R7 de bout en bout, avec le faux client GitHub (dépôts « missing… » introuvables,
// « private… » privés, tous les autres publics).
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');

describe('salles de projet : créer, rejoindre (R1, R3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie: Record<'awa' | 'moussa' | 'kwame', string> = { awa: '', moussa: '', kwame: '' };
  const handle = (n: string) => `${n}-rooms-${suffix}`;
  let room: { id: string; code: string };

  const post = (who: keyof typeof cookie, path: string, body: object = {}, key = randomUUID()) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie[who])
      .set('Idempotency-Key', key)
      .send(body);
  const get = (path: string, who?: keyof typeof cookie) => {
    const r = request(app.getHttpServer()).get(path);
    return who ? r.set('Cookie', cookie[who]) : r;
  };
  const roomBody = (over: object = {}) => ({
    name: `Paylink ${suffix}`,
    description: 'Paiements mobile money pour les petits commerces.',
    state: 'looking_for_help',
    repoFullName: `awa-rooms-${suffix}/paylink`,
    demoUrl: 'https://paylink.example',
    stackTagSlugs: ['docker', 'nodejs'],
    ...over,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [
      { slug: 'docker', label: 'Docker' },
      { slug: 'nodejs', label: 'Node.js' },
    ]);
    for (const n of ['awa', 'moussa', 'kwame'] as const) cookie[n] = await signInAs(app, handle(n));
  });

  afterAll(async () => {
    await app.close();
  });

  it('Awa crée une salle liée à son dépôt vérifié : 201, fiche complète, +5 XP pour la démo', async () => {
    const key = randomUUID();
    const res = await post('awa', '/api/v1/rooms', roomBody(), key).expect(201);
    room = { id: res.body.id, code: res.body.code };
    expect(res.headers.location).toBe(`/api/v1/rooms/${room.code}`);
    expect(res.body).toMatchObject({
      state: 'looking_for_help',
      visibility: 'public',
      repo: { fullName: `awa-rooms-${suffix}/paylink`, verified: true },
      owner: { handle: handle('awa') },
      memberCount: 1,
      viewer: { role: 'owner', joinRequest: null },
    });
    expect(res.body.stack.map((t: { slug: string }) => t.slug).sort()).toEqual([
      'docker',
      'nodejs',
    ]);

    const replay = await post('awa', '/api/v1/rooms', roomBody(), key).expect(201);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body.id).toBe(room.id);

    const awa = await prisma.user.findUniqueOrThrow({ where: { handle: handle('awa') } });
    const demo = await prisma.xpEvent.aggregate({
      where: { userId: awa.id, kind: 'project_demo_shared' },
      _sum: { points: true },
    });
    expect(demo._sum.points).toBe(5);
  });

  it('dépôt introuvable ou privé : 422 ; étiquette inconnue : 422', async () => {
    const missing = await post(
      'awa',
      '/api/v1/rooms',
      roomBody({ repoFullName: 'awa/missing-repo' }),
    ).expect(422);
    expect(missing.body.code).toBe('room.repo_not_found');
    const priv = await post(
      'awa',
      '/api/v1/rooms',
      roomBody({ repoFullName: 'awa/private-repo' }),
    ).expect(422);
    expect(priv.body.code).toBe('room.repo_private');
    const tags = await post(
      'awa',
      '/api/v1/rooms',
      roomBody({ stackTagSlugs: ['cobol-74'] }),
    ).expect(422);
    expect(tags.body.code).toBe('question.tags_unknown');
  });

  it('fiche publique par code, liste publique ; une salle non listée n’est que dans « mes salles »', async () => {
    const pub = await get(`/api/v1/rooms/${room.code}`).expect(200);
    expect(pub.body).toMatchObject({ id: room.id, viewer: null });
    await get('/api/v1/rooms/inexistant').expect(404);

    const hidden = await post(
      'awa',
      '/api/v1/rooms',
      roomBody({ visibility: 'unlisted', repoFullName: null, demoUrl: null }),
    ).expect(201);
    const list = await get(`/api/v1/rooms?q=Paylink ${suffix}&limit=50`).expect(200);
    const ids = list.body.data.map((r: { id: string }) => r.id);
    expect(ids).toContain(room.id);
    expect(ids).not.toContain(hidden.body.id);
    const mine = await get('/api/v1/rooms?mine=true&limit=50', 'awa').expect(200);
    expect(mine.body.data.map((r: { id: string }) => r.id)).toEqual(
      expect.arrayContaining([room.id, hidden.body.id]),
    );
    await get(`/api/v1/rooms/${hidden.body.code}`).expect(200);
  });

  it('Moussa demande à rejoindre : Awa est notifiée ; redemander renvoie la même demande', async () => {
    const first = await post('moussa', `/api/v1/rooms/${room.id}/join`, {
      message: 'Je connais Docker',
    }).expect(201);
    expect(first.body).toMatchObject({ roomId: room.id, status: 'pending' });
    const again = await post('moussa', `/api/v1/rooms/${room.id}/join`, {}).expect(200);
    expect(again.body.id).toBe(first.body.id);

    const inbox = await get('/api/v1/notifications', 'awa').expect(200);
    expect(inbox.body.data[0]).toMatchObject({
      type: 'join.request',
      payload: { roomId: room.id },
    });
    const detail = await get(`/api/v1/rooms/${room.code}`, 'moussa').expect(200);
    expect(detail.body.viewer).toEqual({ role: null, joinRequest: 'pending' });
  });

  it('seule Awa voit et décide les demandes ; elle accepte, Moussa devient membre', async () => {
    await get(`/api/v1/rooms/${room.id}/join-requests`, 'moussa').expect(403);
    const list = await get(`/api/v1/rooms/${room.id}/join-requests`, 'awa').expect(200);
    const pending = list.body.data.find(
      (r: { user: { handle: string } }) => r.user.handle === handle('moussa'),
    );
    expect(pending).toMatchObject({ status: 'pending', message: 'Je connais Docker' });

    await post('kwame', `/api/v1/join-requests/${pending.id}/decide`, {
      decision: 'accept',
    }).expect(403);
    const decided = await post('awa', `/api/v1/join-requests/${pending.id}/decide`, {
      decision: 'accept',
    }).expect(200);
    expect(decided.body).toMatchObject({ status: 'accepted' });
    await post('awa', `/api/v1/join-requests/${pending.id}/decide`, { decision: 'refuse' }).expect(
      409,
    );

    const detail = await get(`/api/v1/rooms/${room.code}`, 'moussa').expect(200);
    expect(detail.body).toMatchObject({ memberCount: 2, viewer: { role: 'member' } });
    const inbox = await get('/api/v1/notifications', 'moussa').expect(200);
    expect(inbox.body.data[0]).toMatchObject({
      type: 'join.decided',
      payload: { decision: 'accepted' },
    });

    const member = await post('moussa', `/api/v1/rooms/${room.id}/join`, {}).expect(409);
    expect(member.body.code).toBe('room.already_member');
  });

  it('hors ligne : la demande pour rejoindre passe aussi par /sync', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sync')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.kwame)
      .send({
        actions: [
          {
            opId: randomUUID(),
            type: 'join_request.create',
            payload: { roomId: room.id, message: null },
          },
        ],
      })
      .expect(200);
    expect(res.body.results[0]).toMatchObject({
      status: 'applied',
      httpStatus: 201,
      data: { status: 'pending' },
    });
  });
});
