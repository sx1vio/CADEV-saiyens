import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// Jetons de portée « platform » et outils plateforme du serveur MCP (11/11/2026) : l'agent IA
// agit sur DevHub au nom du dev, sauf sur son compte, ses jetons et l'administration.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const login = `kofi-mcp-${suffix}`;

type ToolResult = { result: { isError: boolean; content: { text: string }[] } };

describe('Serveur MCP de la plateforme (jeton « platform »)', () => {
  let app: INestApplication;
  let cookie: string;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    // Les outils plateforme appellent l'API par la boucle locale : le serveur doit écouter.
    await app.listen(0, '127.0.0.1');
    cookie = await signInAs(app, login);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const bearer = () => ({ Authorization: `Bearer ${token}` });
  let rpcId = 0;
  const mcp = (method: string, params?: object) =>
    http()
      .post('/api/v1/mcp')
      .set(bearer())
      .send({ jsonrpc: '2.0', id: ++rpcId, method, ...(params ? { params } : {}) })
      .expect(200);
  const callTool = async (name: string, args: object = {}) =>
    (await mcp('tools/call', { name, arguments: args })).body as ToolResult;

  it('crée un jeton de portée « platform », affichée dans la liste', async () => {
    const res = await http()
      .post('/api/v1/me/tokens')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .send({ name: 'Agent IA', scope: 'platform' })
      .expect(201);
    token = res.body.token as string;
    expect(res.body.scope).toBe('platform');
    const list = await http().get('/api/v1/me/tokens').set('Cookie', cookie).expect(200);
    expect(list.body.items[0].scope).toBe('platform');
  });

  it('ouvre les routes du compte connecté, y compris les écritures, sans en-tête d’origine', async () => {
    const me = await http().get('/api/v1/me').set(bearer()).expect(200);
    expect(me.body.handle).toBe(login);
    const patched = await http()
      .patch('/api/v1/me')
      .set(bearer())
      .set('Idempotency-Key', randomUUID())
      .send({ bio: 'Mise à jour par mon agent IA' })
      .expect(200);
    expect(patched.body.bio).toBe('Mise à jour par mon agent IA');
  });

  it('ferme les jetons, la suppression du compte, la connexion et l’administration', async () => {
    const tokens = await http().get('/api/v1/me/tokens').set(bearer()).expect(403);
    expect(tokens.body.code).toBe('auth.token_forbidden_route');
    await http().post('/api/v1/me/tokens').set(bearer()).send({ name: 'x' }).expect(403);
    await http().delete('/api/v1/me').set(bearer()).send({ confirmHandle: login }).expect(403);
    await http().post('/api/v1/auth/logout').set(bearer()).expect(403);
    const admin = await http().get('/api/v1/admin/overview').set(bearer());
    expect([401, 403, 404]).toContain(admin.status);
  });

  it('annonce tous les outils et les instructions de la plateforme', async () => {
    const init = await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {} });
    expect(init.body.result.serverInfo.name).toBe('devhub');
    expect(init.body.result.instructions).toContain('ask_question');
    const list = await mcp('tools/list');
    const names = (list.body.result.tools as { name: string }[]).map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['run_preflight', 'whoami', 'ask_question', 'apply_job', 'call_api']),
    );
    expect(names.length).toBeGreaterThan(30);
  });

  it('exécute les outils par la vraie API : lecture, écriture et accès direct', async () => {
    const who = await callTool('whoami');
    expect(who.result.isError).toBe(false);
    expect(who.result.content[0]!.text).toContain(login);

    const upd = await callTool('update_my_profile', { lookingFor: 'Une mission React' });
    expect(upd.result.isError).toBe(false);
    const me = await http().get('/api/v1/me').set('Cookie', cookie).expect(200);
    expect(me.body.lookingFor).toBe('Une mission React');

    const questions = await callTool('list_questions', { limit: 5 });
    expect(questions.result.isError).toBe(false);
    const passport = await callTool('get_passport', { handle: login });
    expect(passport.result.isError).toBe(false);

    const tags = await callTool('call_api', { method: 'GET', path: '/tags' });
    expect(tags.result.isError).toBe(false);
  });

  it('les gardes s’appliquent aussi aux appels de l’agent', async () => {
    const r = await callTool('call_api', { method: 'GET', path: '/me/tokens' });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0]!.text).toContain('403');
    const missing = await callTool('get_question', {});
    expect(missing.result.isError).toBe(true);
  });
});
