import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// Jetons d'API personnels du pré-vol : créés avec une session, utilisables par un agent IA (MCP)
// ou une CI, mais seulement sur les routes du pré-vol, et révocables.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');

describe('Jetons d’API et serveur MCP du pré-vol', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let token: string;
  let tokenId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    cookie = await signInAs(app, `awa-pat-${suffix}`);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const mcp = (body: object, auth = `Bearer ${token}`) =>
    http().post('/api/v1/mcp').set('Authorization', auth).send(body);

  it('crée un jeton avec une session ; il n’est montré qu’une fois et seule son empreinte est stockée', async () => {
    const res = await http()
      .post('/api/v1/me/tokens')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .send({ name: 'Claude Code' })
      .expect(201);
    token = res.body.token as string;
    tokenId = res.body.id as string;
    expect(token).toMatch(/^dh_pat_[A-Za-z0-9_-]{43}$/);
    expect(res.body.hint).toBe(token.slice(-4));

    const row = await prisma.apiToken.findUniqueOrThrow({ where: { id: tokenId } });
    expect(row.tokenHash).not.toContain(token);

    const list = await http().get('/api/v1/me/tokens').set('Cookie', cookie).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].token).toBeUndefined();
  });

  it('le jeton ouvre le pré-vol et le MCP, pas le reste du compte', async () => {
    await http().get('/api/v1/preflight').set('Authorization', `Bearer ${token}`).expect(200);
    // Ni créer d'autres jetons, ni lire le profil.
    await http()
      .post('/api/v1/me/tokens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'x' })
      .expect(403);
    const me = await http().get('/api/v1/me').set('Authorization', `Bearer ${token}`).expect(403);
    expect(me.body.code).toBe('auth.token_scope');

    const init = await mcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {} },
    }).expect(200);
    expect(init.body.result.serverInfo.name).toBe('devhub');
    await mcp({ jsonrpc: '2.0', method: 'notifications/initialized' }).expect(202);
    const tools = await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list' }).expect(200);
    expect(tools.body.result.tools).toHaveLength(3);
    const run = await mcp({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'run_preflight', arguments: { url: 'https://127.0.0.1.nip.io' } },
    }).expect(200);
    expect(run.body.result.isError).toBe(true);
  });

  it('refuse un jeton inconnu (401) et un appel MCP sans jeton (401, pas 403)', async () => {
    const bad = await mcp({ jsonrpc: '2.0', id: 1, method: 'ping' }, 'Bearer dh_pat_nope');
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('auth.invalid_token');
    const none = await http().post('/api/v1/mcp').send({ jsonrpc: '2.0', id: 1, method: 'ping' });
    expect(none.status).toBe(401);
    await http().get('/api/v1/mcp').expect(405);
  });

  it('un jeton révoqué ne passe plus', async () => {
    await http()
      .delete(`/api/v1/me/tokens/${tokenId}`)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .expect(204);
    await http().get('/api/v1/preflight').set('Authorization', `Bearer ${token}`).expect(401);
  });
});
