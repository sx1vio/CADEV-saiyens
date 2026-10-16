import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { Deployments } from '../src/modules/rooms/application/deployments';
import { DeploymentUnreachableError } from '../src/modules/rooms/domain/deployment';
import type { ProbeResponse } from '../src/modules/rooms/domain/ports';
import { DEPLOYMENT_PROBE } from '../src/modules/rooms/tokens';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// Idée A de bout en bout : preuve « en production sur Systalink », avec une sonde simulée
// (aucun appel réseau). 102.203.220.0/22 est la plage Systalink par défaut.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const SYSTALINK_IP = '102.203.220.60';

describe('preuve de déploiement (idée A, Systalink)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie: Record<'awa' | 'moussa', string> = { awa: '', moussa: '' };
  const handle = (n: string) => `${n}-deploy-${suffix}`;
  let room: { id: string; code: string };
  /** Ce que sert chaque URL ; absente = injoignable. */
  const site = new Map<string, Omit<ProbeResponse, 'latencyMs'>>();

  const send = (
    method: 'put' | 'post' | 'get',
    who: keyof typeof cookie,
    path: string,
    body?: object,
  ) => {
    const r = request(app.getHttpServer())[method](path).set('Cookie', cookie[who]);
    return method === 'get' ? r : r.set(WRITE_HEADERS).send(body ?? {});
  };
  const awaXp = () =>
    prisma.xpEvent.count({
      where: { user: { handle: handle('awa') }, kind: 'deployment_verified', sourceId: room.id },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DEPLOYMENT_PROBE)
      .useValue({
        fetch: async (url: string): Promise<ProbeResponse> => {
          const page = site.get(url);
          if (!page) throw new DeploymentUnreachableError();
          return { ...page, latencyMs: 42 };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    for (const n of ['awa', 'moussa'] as const) cookie[n] = await signInAs(app, handle(n));
    const res = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.awa)
      .set('Idempotency-Key', randomUUID())
      .send({
        name: `Paylink ${suffix}`,
        description: 'Paiements mobile money pour les petits commerces.',
        stackTagSlugs: ['docker'],
      })
      .expect(201);
    room = { id: res.body.id, code: res.body.code };
  });

  afterAll(async () => {
    await app.close();
  });

  it("seul le créateur indique l'URL et reçoit le jeton ; la fiche publique ne le montre pas", async () => {
    await send('put', 'moussa', `/api/v1/rooms/${room.id}/deployment`, {
      url: 'https://paylink.example.sn',
    }).expect(403);
    await send('put', 'awa', `/api/v1/rooms/${room.id}/deployment`, {
      url: 'http://paylink.example.sn',
    }).expect(400);
    const res = await send('put', 'awa', `/api/v1/rooms/${room.id}/deployment`, {
      url: 'https://paylink.example.sn',
    }).expect(200);
    expect(res.body).toMatchObject({
      url: 'https://paylink.example.sn',
      status: 'pending',
      hostedOnSystalink: false,
      proofPath: '/.well-known/devhub-proof.txt',
    });
    expect(res.body.token).toMatch(/^devhub-[0-9a-f]{24}$/);

    const pub = await request(app.getHttpServer()).get(`/api/v1/rooms/${room.code}`).expect(200);
    expect(pub.body.deployment).toEqual(expect.objectContaining({ status: 'pending' }));
    expect(JSON.stringify(pub.body)).not.toContain(res.body.token);
  });

  it('jeton absent, puis servi ailleurs que chez Systalink : vérifiée, sans Proof XP', async () => {
    const { body: ch } = await send('get', 'awa', `/api/v1/rooms/${room.id}/deployment`).expect(
      200,
    );
    site.set('https://paylink.example.sn', {
      status: 200,
      body: '<html></html>',
      ips: ['188.114.96.2'],
    });
    const missing = await send('post', 'awa', `/api/v1/rooms/${room.id}/deployment/verify`).expect(
      422,
    );
    expect(missing.body.code).toBe('deployment.proof_missing');

    site.set('https://paylink.example.sn', {
      status: 200,
      body: `<head><meta name="devhub-proof" content="${ch.token}"></head>`,
      ips: ['188.114.96.2'],
    });
    const ok = await send('post', 'awa', `/api/v1/rooms/${room.id}/deployment/verify`).expect(200);
    expect(ok.body).toMatchObject({
      xpAwarded: false,
      deployment: { status: 'verified', hostedOnSystalink: false },
    });
    expect(await awaXp()).toBe(0);
  });

  it('servie depuis Systalink : +10 Proof XP, une seule fois ; la disponibilité est sondée', async () => {
    const { body: ch } = await send('get', 'awa', `/api/v1/rooms/${room.id}/deployment`).expect(
      200,
    );
    site.set('https://paylink.example.sn/.well-known/devhub-proof.txt', {
      status: 200,
      body: `${ch.token}\n`,
      ips: [SYSTALINK_IP],
    });
    const first = await send('post', 'awa', `/api/v1/rooms/${room.id}/deployment/verify`).expect(
      200,
    );
    expect(first.body).toMatchObject({
      xpAwarded: true,
      deployment: { status: 'verified', hostedOnSystalink: true, uptime: null },
    });
    const again = await send('post', 'awa', `/api/v1/rooms/${room.id}/deployment/verify`).expect(
      200,
    );
    expect(again.body.xpAwarded).toBe(false);
    expect(await awaXp()).toBe(1);

    // Sondes du worker : une réponse, puis une coupure.
    site.set('https://paylink.example.sn', { status: 200, body: 'ok', ips: [SYSTALINK_IP] });
    await app.get(Deployments).checkAll();
    site.delete('https://paylink.example.sn');
    await app.get(Deployments).checkAll();
    const pub = await request(app.getHttpServer()).get(`/api/v1/rooms/${room.code}`).expect(200);
    expect(pub.body.deployment).toMatchObject({
      status: 'verified',
      hostedOnSystalink: true,
      lastUp: false,
      uptime: 0.5,
    });
  });

  it('une autre application : nouveau jeton, la vérification repart de zéro', async () => {
    const before = await send('get', 'awa', `/api/v1/rooms/${room.id}/deployment`).expect(200);
    const res = await send('put', 'awa', `/api/v1/rooms/${room.id}/deployment`, {
      url: 'https://paylink-v2.example.sn',
    }).expect(200);
    expect(res.body.token).not.toBe(before.body.token);
    expect(res.body).toMatchObject({ status: 'pending', hostedOnSystalink: false, uptime: null });
    const unreachable = await send(
      'post',
      'awa',
      `/api/v1/rooms/${room.id}/deployment/verify`,
    ).expect(422);
    expect(unreachable.body.code).toBe('deployment.unreachable');
  });
});
