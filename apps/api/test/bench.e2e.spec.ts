import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { BENCH_HOST_RESOLVER } from '../src/modules/bench/infrastructure/host-resolver';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// Banc d'essai de bout en bout : demande, rapports sur de vrais appareils, confirmation et Proof XP.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
type Who = 'awa' | 'moussa' | 'kofi' | 'lina';

describe('Banc d’essai', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie = {} as Record<Who, string>;
  const handle = (n: Who) => `${n}-bench-${suffix}`;
  let benchId = '';

  const send = (method: 'get' | 'post', who: Who | null, path: string, body?: object) => {
    const r = request(app.getHttpServer())[method](path);
    if (who) r.set('Cookie', cookie[who]);
    return method === 'get' ? r : r.set(WRITE_HEADERS).send(body ?? {});
  };
  const report = (overrides: object = {}) => ({
    device: 'android_low',
    model: 'Tecno Spark 10',
    os: 'Android 13',
    browser: 'Chrome 131',
    network: '3g',
    country: 'bj',
    verdict: 'issues',
    findings: [
      {
        severity: 'major',
        title: 'Le paiement Wave reste bloqué',
        details: 'Ouvrir le panier, payer : le bouton tourne sans fin.',
      },
    ],
    notes: 'Testé dans un taxi-moto, réseau instable.',
    ...overrides,
  });

  beforeAll(async () => {
    // DNS simulé : une seule application est servie depuis le réseau Systalink (102.203.220.0/22).
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(BENCH_HOST_RESOLVER)
      .useValue(async (host: string) =>
        host === 'dakar-shop.example' ? ['102.203.221.40'] : ['203.0.113.9'],
      )
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    for (const n of ['awa', 'moussa', 'kofi', 'lina'] as const)
      cookie[n] = await signInAs(app, handle(n));
    // Les comptes ont plus d'une heure : ils peuvent publier une demande.
    await prisma.user.updateMany({
      where: { handle: { in: (['awa', 'moussa', 'kofi', 'lina'] as const).map(handle) } },
      data: { createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000) },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuse une demande sans compte ou avec une URL non HTTPS', async () => {
    await send('post', null, '/api/v1/bench', {}).expect(401);
    await send('post', 'awa', '/api/v1/bench', {
      title: 'Boutique Paylink',
      appUrl: 'http://paylink.example',
      instructions: 'Ajouter un article au panier puis payer avec Wave.',
      devices: ['android_low'],
      networks: ['3g'],
    }).expect(400);
  });

  it('publie une demande visible par tous, sans les rapports', async () => {
    const res = await send('post', 'awa', '/api/v1/bench', {
      title: `Boutique Paylink ${suffix}`,
      appUrl: 'https://paylink.example',
      instructions: 'Ajouter un article au panier puis payer avec Wave. Compte : demo / demo.',
      devices: ['android_low', 'iphone'],
      networks: ['3g', 'offline'],
      maxTesters: 2,
    }).expect(201);
    benchId = res.body.id;
    const list = await send('get', null, '/api/v1/bench?device=android_low').expect(200);
    expect(list.body.data.some((b: { id: string }) => b.id === benchId)).toBe(true);
    const other = await send('get', null, '/api/v1/bench?device=desktop').expect(200);
    expect(other.body.data.some((b: { id: string }) => b.id === benchId)).toBe(false);
  });

  it('repère les applications hébergées chez Systalink et permet de les filtrer', async () => {
    const res = await send('post', 'kofi', '/api/v1/bench', {
      title: `Boutique Dakar ${suffix}`,
      appUrl: 'https://dakar-shop.example/catalogue',
      instructions: 'Parcourir le catalogue en 3G et ajouter un article au panier.',
      devices: ['android_low'],
      networks: ['3g'],
    }).expect(201);
    const all = await send('get', null, '/api/v1/bench').expect(200);
    const find = (data: { id: string; hostedOnSystalink: boolean }[], id: string) =>
      data.find((b) => b.id === id);
    expect(find(all.body.data, res.body.id)?.hostedOnSystalink).toBe(true);
    expect(find(all.body.data, benchId)?.hostedOnSystalink).toBe(false);
    const only = await send('get', null, '/api/v1/bench?systalink=true').expect(200);
    expect(find(only.body.data, res.body.id)).toBeDefined();
    expect(find(only.body.data, benchId)).toBeUndefined();
    await send('post', 'kofi', `/api/v1/bench/${res.body.id}/close`).expect(204);
  });

  it('refuse le rapport de l’auteur et un appareil non demandé', async () => {
    const own = await send('post', 'awa', `/api/v1/bench/${benchId}/reports`, report()).expect(403);
    expect(own.body.code).toBe('bench.own_request');
    const desk = await send(
      'post',
      'moussa',
      `/api/v1/bench/${benchId}/reports`,
      report({ device: 'desktop' }),
    ).expect(422);
    expect(desk.body.code).toBe('bench.device_not_requested');
  });

  it('accepte deux testeurs puis affiche complet ; un doublon est refusé', async () => {
    await send('post', 'moussa', `/api/v1/bench/${benchId}/reports`, report()).expect(201);
    const dup = await send('post', 'moussa', `/api/v1/bench/${benchId}/reports`, report()).expect(
      409,
    );
    expect(dup.body.code).toBe('bench.already_reported');
    await send(
      'post',
      'kofi',
      `/api/v1/bench/${benchId}/reports`,
      report({ device: 'iphone', network: 'offline', verdict: 'broken', country: null }),
    ).expect(201);
    const full = await send('post', 'lina', `/api/v1/bench/${benchId}/reports`, report()).expect(
      409,
    );
    expect(full.body.code).toBe('bench.full');
    const n = await prisma.notification.count({
      where: { user: { handle: handle('awa') }, type: 'bench.report' },
    });
    expect(n).toBe(2);
  });

  it('montre les rapports au demandeur, le sien au testeur, rien aux autres', async () => {
    const mine = await send('get', 'awa', `/api/v1/bench/${benchId}`).expect(200);
    expect(mine.body.reports).toHaveLength(2);
    expect(mine.body.testers).toBe(2);
    expect(mine.body.coverage).toEqual(
      expect.arrayContaining([
        { device: 'android_low', network: '3g', reports: 1, worst: 'issues' },
        { device: 'iphone', network: 'offline', reports: 1, worst: 'broken' },
      ]),
    );
    const tester = await send('get', 'moussa', `/api/v1/bench/${benchId}`).expect(200);
    expect(tester.body.reports).toHaveLength(1);
    expect(tester.body.reports[0].country).toBe('BJ');
    const visitor = await send('get', null, `/api/v1/bench/${benchId}`).expect(200);
    expect(visitor.body.reports).toHaveLength(0);
    expect(visitor.body.coverage).toHaveLength(2);
  });

  it('confirme un rapport (+8 Proof XP au testeur), en refuse un autre (la place se libère)', async () => {
    const detail = await send('get', 'awa', `/api/v1/bench/${benchId}`).expect(200);
    const byTester = (h: string) =>
      detail.body.reports.find((r: { tester: { handle: string } }) => r.tester.handle === h).id;
    const moussaReport = byTester(handle('moussa'));
    const kofiReport = byTester(handle('kofi'));

    const forbidden = await send('post', 'moussa', `/api/v1/bench/reports/${moussaReport}/review`, {
      decision: 'confirm',
    }).expect(403);
    expect(forbidden.body.code).toBe('bench.not_requester');

    const ok = await send('post', 'awa', `/api/v1/bench/reports/${moussaReport}/review`, {
      decision: 'confirm',
    }).expect(200);
    expect(ok.body).toMatchObject({ status: 'confirmed', points: 8 });
    await send('post', 'awa', `/api/v1/bench/reports/${moussaReport}/review`, {
      decision: 'confirm',
    }).expect(409);
    const xp = await prisma.xpEvent.aggregate({
      where: { user: { handle: handle('moussa') }, kind: 'field_test_confirmed' },
      _sum: { points: true },
    });
    expect(xp._sum.points).toBe(8);

    await send('post', 'awa', `/api/v1/bench/reports/${kofiReport}/review`, {
      decision: 'reject',
    }).expect(200);
    await send('post', 'lina', `/api/v1/bench/${benchId}/reports`, report()).expect(201);
    const proofs = await send('get', null, `/api/v1/u/${handle('moussa')}/proofs`).expect(200);
    expect(proofs.body.events[0]).toMatchObject({ kind: 'field_test_confirmed', points: 8 });
  });

  it('ferme la demande : plus aucun rapport, et elle quitte la liste ouverte', async () => {
    await send('post', 'moussa', `/api/v1/bench/${benchId}/close`).expect(404);
    await send('post', 'awa', `/api/v1/bench/${benchId}/close`).expect(204);
    const list = await send('get', null, '/api/v1/bench').expect(200);
    expect(list.body.data.some((b: { id: string }) => b.id === benchId)).toBe(false);
    const mine = await send('get', 'awa', '/api/v1/bench?scope=mine').expect(200);
    expect(mine.body.data[0]).toMatchObject({ id: benchId, status: 'closed', mine: true });
    const tested = await send('get', 'kofi', '/api/v1/bench?scope=tested').expect(200);
    expect(tested.body.data[0]).toMatchObject({ id: benchId, reported: true });
  });
});
