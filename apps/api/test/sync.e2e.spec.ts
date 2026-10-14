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

// O2 et O4 de bout en bout : la file hors ligne d'Awa arrive en un lot au retour du réseau.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');

describe('synchronisation hors ligne (O2, O4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let awa: string;
  let moussa: string;

  const sync = (cookie: string, actions: object[]) =>
    request(app.getHttpServer())
      .post('/api/v1/sync')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .send({ actions });

  const questionPayload = (
    clientId: string,
    title = `Hors ligne ${suffix} : nginx renvoie 502`,
  ) => ({
    clientId,
    title,
    body: 'Rédigée dans le bus, sans réseau.',
    tagSlugs: ['docker'],
    lang: 'fr',
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    awa = await signInAs(app, `awa-sync-${suffix}`);
    moussa = await signInAs(app, `moussa-sync-${suffix}`);
  });

  afterAll(async () => {
    await app.close();
  });

  const qClient = randomUUID();
  const aClient = randomUUID();
  const ops = { create: randomUUID(), update: randomUUID(), answer: randomUUID() };
  const offlineBatch = () => [
    { opId: ops.create, type: 'question.create', payload: questionPayload(qClient) },
    {
      opId: ops.update,
      type: 'question.update',
      payload: { questionId: `client:${qClient}`, body: 'Corrigée avant le retour du réseau.' },
      baseVersion: 1,
    },
    {
      opId: ops.answer,
      type: 'answer.create',
      payload: {
        questionId: `client:${qClient}`,
        clientId: aClient,
        body: 'Piste trouvée entre-temps.',
      },
    },
  ];

  it('applique dans l’ordre, en résolvant les références client:', async () => {
    const res = await sync(awa, offlineBatch()).expect(200);
    expect(
      res.body.results.map((r: { status: string; httpStatus: number }) => [r.status, r.httpStatus]),
    ).toEqual([
      ['applied', 201],
      ['applied', 200],
      ['applied', 201],
    ]);
    const questionId = res.body.results[0].data.id;
    expect(res.body.results[1].data).toMatchObject({ id: questionId, version: 2 });
    expect(res.body.results[2].data).toMatchObject({ questionId, clientId: aClient });
    expect(Date.parse(res.body.serverTime)).not.toBeNaN();
    expect(await prisma.contentRevision.count({ where: { contentId: questionId } })).toBe(1);
  });

  it('renvoyer le même lot : tout est « duplicate », sans doublon en base', async () => {
    const first = await sync(awa, offlineBatch()).expect(200);
    expect(first.body.results.map((r: { status: string }) => r.status)).toEqual([
      'duplicate',
      'duplicate',
      'duplicate',
    ]);
    expect(await prisma.question.count({ where: { clientId: qClient } })).toBe(1);
    expect(await prisma.answer.count({ where: { clientId: aClient } })).toBe(1);
  });

  it('la même action par l’endpoint unitaire, avec la même clé : rejouée, pas recréée', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set(WRITE_HEADERS)
      .set('Cookie', awa)
      .set('Idempotency-Key', ops.create)
      .send(questionPayload(qClient))
      .expect(201);
    expect(res.headers['idempotent-replayed']).toBe('true');
  });

  it('modification sur une version périmée : « conflict » avec la version serveur', async () => {
    const res = await sync(awa, [
      {
        opId: randomUUID(),
        type: 'question.update',
        payload: { questionId: `client:${qClient}`, title: 'Titre modifié sur un autre appareil' },
        baseVersion: 1,
      },
    ]).expect(200);
    expect(res.body.results[0]).toMatchObject({
      status: 'conflict',
      httpStatus: 409,
      data: { server: { version: 2, body: 'Corrigée avant le retour du réseau.' } },
    });
  });

  it('PATCH unitaire : même règle, 409 version_conflict avec la version serveur', async () => {
    const q = await prisma.question.findFirstOrThrow({ where: { clientId: qClient } });
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/questions/${q.id}`)
      .set(WRITE_HEADERS)
      .set('Cookie', awa)
      .set('Idempotency-Key', randomUUID())
      .send({ body: 'Encore une version', baseVersion: 1 })
      .expect(409);
    expect(res.body).toMatchObject({ code: 'version_conflict', server: { version: 2 } });
    await request(app.getHttpServer())
      .patch(`/api/v1/questions/${q.id}`)
      .set(WRITE_HEADERS)
      .set('Cookie', moussa)
      .set('Idempotency-Key', randomUUID())
      .send({ body: 'Pas ma question', baseVersion: 2 })
      .expect(403);
  });

  it('création refusée : les actions qui en dépendent sont « skipped », le lot continue', async () => {
    const bad = randomUUID();
    const res = await sync(awa, [
      { opId: randomUUID(), type: 'question.create', payload: questionPayload(bad, 'court') },
      {
        opId: randomUUID(),
        type: 'answer.create',
        payload: {
          questionId: `client:${bad}`,
          clientId: randomUUID(),
          body: 'Dépend de la précédente',
        },
      },
      {
        opId: randomUUID(),
        type: 'answer.create',
        payload: {
          questionId: `client:${randomUUID()}`,
          clientId: randomUUID(),
          body: 'Référence inconnue',
        },
      },
      { opId: randomUUID(), type: 'question.create', payload: questionPayload(randomUUID()) },
    ]).expect(200);
    expect(
      res.body.results.map((r: { status: string; httpStatus: number }) => [r.status, r.httpStatus]),
    ).toEqual([
      ['rejected', 400],
      ['skipped', 424],
      ['rejected', 404],
      ['applied', 201],
    ]);
    expect(res.body.results[1].error.code).toBe('sync.dependency_failed');
  });

  it('refus métier (valider la réponse d’une autre question) : « rejected » avec le code', async () => {
    const answer = await prisma.answer.findFirstOrThrow({ where: { clientId: aClient } });
    const res = await sync(moussa, [
      { opId: randomUUID(), type: 'answer.accept', payload: { answerId: answer.id } },
    ]).expect(200);
    expect(res.body.results[0]).toMatchObject({
      status: 'rejected',
      httpStatus: 403,
      error: { code: 'forbidden' },
    });
  });

  it('au-delà de 6 lots par minute : 429 avec Retry-After', async () => {
    const kwame = await signInAs(app, `kwame-sync-${suffix}`);
    const one = () => [
      { opId: randomUUID(), type: 'question.create', payload: questionPayload(randomUUID()) },
    ];
    for (let i = 0; i < 6; i++) await sync(kwame, one()).expect(200);
    const res = await sync(kwame, one()).expect(429);
    expect(res.body.code).toBe('rate_limited');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});
