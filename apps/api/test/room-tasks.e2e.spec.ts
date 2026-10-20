import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { PrismaRoomTasksStore } from '../src/modules/ai/infrastructure/prisma-room-tasks.store';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// R2, R4, R8, R9 de bout en bout. Le faux client GitHub considère la PR n° N fusionnée si N est
// pair, et son auteur est « pr-author-N » : ce compte joue le contributeur.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const pr = randomInt(1, 400_000) * 2; // pair : fusionnée
const owner = `awa-tasks-${suffix}`;
const repo = `${owner}/paylink`;

describe('tâches et discussion des salles (R2, R4, R8, R9)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie = new Map<string, string>();
  const handle = {
    awa: owner,
    contrib: `pr-author-${pr}`,
    moussa: `moussa-tasks-${suffix}`,
    kwame: `kwame-tasks-${suffix}`,
  };
  let roomId: string;
  let taskId: string;

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
  const join = async (who: keyof typeof handle) => {
    const req = await post(who, `/api/v1/rooms/${roomId}/join`).expect(201);
    await post('awa', `/api/v1/join-requests/${req.body.id}/decide`, { decision: 'accept' }).expect(
      200,
    );
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'nodejs', label: 'Node.js' }]);
    for (const [who, login] of Object.entries(handle)) cookie.set(who, await signInAs(app, login));
    const room = await post('awa', '/api/v1/rooms', {
      name: `Paylink ${suffix}`,
      description: 'Paiements mobile money pour les petits commerces.',
      repoFullName: repo,
      stackTagSlugs: ['nodejs'],
    }).expect(201);
    roomId = room.body.id;
    await join('contrib');
    await join('moussa');
  });

  afterAll(async () => {
    await app.close();
  });

  /** Ouvre un flux SSE, lit seulement le statut, puis le ferme. */
  const fetchHead = async (path: string) => {
    const server = app.getHttpServer();
    if (!server.listening) await new Promise<void>((r) => server.listen(0, r));
    const { port } = server.address() as { port: number };
    const controller = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: controller.signal });
    controller.abort();
    return res.status;
  };

  it('créer une tâche : membres seulement', async () => {
    const res = await post('awa', `/api/v1/rooms/${roomId}/tasks`, {
      title: 'Ajouter Orange Money',
      level: 'hard',
    }).expect(201);
    taskId = res.body.id;
    expect(res.body).toMatchObject({
      status: 'open',
      level: 'hard',
      assignee: null,
      fromGithubIssue: false,
    });
    const no = await post('kwame', `/api/v1/rooms/${roomId}/tasks`, { title: 'Intrusion' }).expect(
      403,
    );
    expect(no.body.code).toBe('room.not_member');
  });

  it('importer les issues du dépôt : une seule fois chacune', async () => {
    const first = await post('awa', `/api/v1/rooms/${roomId}/tasks/import-issues`).expect(200);
    expect(first.body).toMatchObject({ imported: 3, skipped: 0 });
    expect(first.body.data.map((t: { level: string }) => t.level)).toContain('first_step');
    const again = await post('awa', `/api/v1/rooms/${roomId}/tasks/import-issues`).expect(200);
    expect(again.body).toMatchObject({ imported: 0, skipped: 3 });
    const list = await get(`/api/v1/rooms/${roomId}/tasks`).expect(200);
    expect(list.body.data).toHaveLength(4);
  });

  it('prendre : le contributeur la prend ; un autre membre ne peut plus ; un non-membre jamais', async () => {
    const taken = await post('contrib', `/api/v1/tasks/${taskId}/take`).expect(200);
    expect(taken.body).toMatchObject({ status: 'taken', assignee: { handle: handle.contrib } });
    expect((await post('moussa', `/api/v1/tasks/${taskId}/take`).expect(409)).body.code).toBe(
      'task.already_taken',
    );
    expect((await post('kwame', `/api/v1/tasks/${taskId}/take`).expect(403)).body.code).toBe(
      'room.not_member',
    );
  });

  it('soumettre : PR du dépôt de la salle, par l’assigné', async () => {
    const other = await post('contrib', `/api/v1/tasks/${taskId}/submit`, {
      prUrl: `https://github.com/someone/else/pull/${pr}`,
    }).expect(422);
    expect(other.body.code).toBe('task.pr_invalid');
    await post('moussa', `/api/v1/tasks/${taskId}/submit`, {
      prUrl: `https://github.com/${repo}/pull/${pr}`,
    }).expect(403);
    const sub = await post('contrib', `/api/v1/tasks/${taskId}/submit`, {
      prUrl: `https://github.com/${repo}/pull/${pr}`,
    }).expect(200);
    expect(sub.body).toMatchObject({
      status: 'in_review',
      prUrl: `https://github.com/${repo}/pull/${pr}`,
    });
  });

  it('clôturer : réservé au créateur ; +15 XP, « Vérifié par GitHub », contributeur notifié', async () => {
    expect((await post('moussa', `/api/v1/tasks/${taskId}/complete`).expect(403)).body.code).toBe(
      'forbidden',
    );
    const done = await post('awa', `/api/v1/tasks/${taskId}/complete`).expect(200);
    expect(done.body).toMatchObject({
      points: 15,
      withheld: [],
      task: { status: 'done', verification: 'github_verified', completedAt: expect.any(String) },
    });
    const contrib = await prisma.user.findUniqueOrThrow({ where: { handle: handle.contrib } });
    const xp = await prisma.xpEvent.aggregate({
      where: { userId: contrib.id, kind: 'task_completed' },
      _sum: { points: true },
    });
    expect(xp._sum.points).toBe(15);
    const inbox = await get('/api/v1/notifications', 'contrib').expect(200);
    expect(inbox.body.data[0]).toMatchObject({
      type: 'task.completed',
      payload: {
        taskId,
        taskTitle: 'Ajouter Orange Money',
        roomName: `Paylink ${suffix}`,
        points: 15,
        verification: 'github_verified',
      },
    });
    expect((await post('awa', `/api/v1/tasks/${taskId}/complete`).expect(409)).body.code).toBe(
      'task.invalid_status',
    );
  });

  it('PR non fusionnée : la contribution est « déclarée par le créateur »', async () => {
    const t = await post('awa', `/api/v1/rooms/${roomId}/tasks`, {
      title: 'Corriger le reçu PDF',
    }).expect(201);
    await post('contrib', `/api/v1/tasks/${t.body.id}/take`).expect(200);
    const done = await post('awa', `/api/v1/tasks/${t.body.id}/complete`, {
      prUrl: `https://github.com/${repo}/pull/${pr + 1}`,
    }).expect(200);
    expect(done.body.task).toMatchObject({ status: 'done', verification: 'declared' });
  });

  it('salle non listée : tâches et temps réel réservés aux membres', async () => {
    const hidden = await post('awa', '/api/v1/rooms', {
      name: `Privée ${suffix}`,
      description: 'Projet en préparation, non listé.',
      visibility: 'unlisted',
      stackTagSlugs: ['nodejs'],
    }).expect(201);
    await get(`/api/v1/rooms/${hidden.body.id}/tasks`).expect(404);
    await get(`/api/v1/rooms/${hidden.body.id}/tasks`, 'kwame').expect(404);
    await get(`/api/v1/rooms/${hidden.body.id}/tasks`, 'awa').expect(200);
    await get(`/api/v1/events?topics=room:${hidden.body.id}`).expect(403);
    await get(`/api/v1/events?topics=room:${hidden.body.id}`, 'kwame').expect(403);
    // Salle publique : le sujet est ouvert à tous (le flux reste ouvert, on ne lit que l'en-tête).
    const res = await fetchHead(`/api/v1/events?topics=room:${roomId}`);
    expect(res).toBe(200);
  });

  it('discussion : membres seulement, ordre fixé par le serveur, aussi hors ligne', async () => {
    const msg = await post('moussa', `/api/v1/rooms/${roomId}/messages`, {
      clientId: randomUUID(),
      body: 'Je prends la doc demain.',
      kind: 'standup',
    }).expect(201);
    expect(msg.body).toMatchObject({ kind: 'standup', author: { handle: handle.moussa } });
    await post('kwame', `/api/v1/rooms/${roomId}/messages`, {
      clientId: randomUUID(),
      body: 'Bonjour',
    }).expect(403);
    await get(`/api/v1/rooms/${roomId}/messages`, 'kwame').expect(403);

    const offline = await request(app.getHttpServer())
      .post('/api/v1/sync')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get('contrib')!)
      .send({
        actions: [
          {
            opId: randomUUID(),
            type: 'room_message.create',
            payload: { roomId, clientId: randomUUID(), body: 'Écrit sans réseau' },
          },
        ],
      })
      .expect(200);
    expect(offline.body.results[0]).toMatchObject({ status: 'applied', httpStatus: 201 });

    const list = await get(`/api/v1/rooms/${roomId}/messages`, 'awa').expect(200);
    expect(list.body.data.map((m: { body: string }) => m.body)).toEqual([
      'Écrit sans réseau',
      'Je prends la doc demain.',
    ]);
  });

  it('R5 : l’IA propose des tâches depuis la discussion, sans rien créer (créateur seulement)', async () => {
    const suggest = (who: keyof typeof handle, body: object = {}) =>
      request(app.getHttpServer())
        .post(`/api/v1/rooms/${roomId}/tasks/suggest`)
        .set(WRITE_HEADERS)
        .set('Cookie', cookie.get(who)!)
        .send(body);
    const before = (await get(`/api/v1/rooms/${roomId}/tasks`).expect(200)).body.data.length;

    expect((await suggest('kwame').expect(403)).body.code).toBe('room.not_member');
    // CDC R5 : « validées par le créateur » ; un simple membre ne lance pas l'analyse.
    expect((await suggest('moussa').expect(403)).body.code).toBe('forbidden');
    await suggest('awa', { lang: 'de' }).expect(400);

    // Faux modèle (aucune clé en test) : une proposition marquée « démonstration ».
    const first = await suggest('awa').expect(200);
    // « cached » si la même discussion a déjà été analysée sur cette base (suite relancée).
    expect(['done', 'cached']).toContain(first.body.status);
    expect(first.body.data).toEqual([
      { title: 'Tâche de démonstration', description: expect.any(String), level: 'easy' },
    ]);
    const again = await suggest('awa').expect(200);
    expect(again.body.status).toBe('cached');
    const en = await suggest('awa', { lang: 'en' }).expect(200);
    expect(en.body.data[0].title).toBe('Demo task');

    const after = (await get(`/api/v1/rooms/${roomId}/tasks`).expect(200)).body.data.length;
    expect(after).toBe(before);
    const logged = await prisma.aiRequest.count({
      where: { kind: 'room_tasks', user: { handle: { in: [handle.moussa, handle.awa] } } },
    });
    expect(logged).toBeGreaterThanOrEqual(3);
  });

  it('R5 : la réservation du quota tient face à des requêtes simultanées (verrou PostgreSQL)', async () => {
    const store = app.get(PrismaRoomTasksStore);
    const user = await prisma.user.findUniqueOrThrow({ where: { handle: handle.kwame } });
    const base = {
      userId: user.id,
      kind: 'room_tasks' as const,
      inputHash: `race-${suffix}`,
      promptVer: 'room_tasks@1',
    };
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const ids = await Promise.all(
      Array.from({ length: 6 }, () => store.reserveModelCall(base, since, 3)),
    );
    expect(ids.filter(Boolean)).toHaveLength(3);
    await store.releaseModelCall(ids.find(Boolean)!);
    expect(await store.reserveModelCall(base, since, 3)).not.toBeNull();
    expect(await store.reserveModelCall(base, since, 3)).toBeNull();
  });
});
