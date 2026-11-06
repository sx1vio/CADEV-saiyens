import { createHash, randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';

// Connexion des applications mobiles (ADR-0021) : navigateur système, retour par devhub://,
// échange du code avec le secret PKCE de l'application, puis session en « Authorization: Bearer ».
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const login = `e2e-mob-${randomBytes(4).toString('hex')}`;
const MOBILE = { 'X-DevHub-Client': 'mobile' };

function cookieValue(res: request.Response, name: string): string | undefined {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const line = raw.find((c) => c.startsWith(`${name}=`));
  return line?.slice(name.length + 1).split(';')[0];
}

function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}

describe('connexion mobile (ADR-0021)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { handle: { startsWith: login } } });
    await app.close();
  });

  /** Parcours du navigateur système jusqu'au retour devhub://auth/callback. */
  async function browserFlow(challenge: string): Promise<URL> {
    const start = await request(app.getHttpServer())
      .get('/api/v1/auth/github/mobile')
      .query({ challenge, login })
      .expect(302);
    const oauthCookie = cookieValue(start, '__Host-oauth');
    const callback = new URL(start.headers.location as string);
    const done = await request(app.getHttpServer())
      .get(callback.pathname + callback.search)
      .set('Cookie', `__Host-oauth=${oauthCookie}`)
      .expect(302);
    // Aucun cookie de session : la session part dans le code, pas dans le navigateur.
    expect(cookieValue(done, '__Host-sid')).toBeUndefined();
    return new URL(done.headers.location as string);
  }

  async function signIn(): Promise<string> {
    const { verifier, challenge } = pkce();
    const back = await browserFlow(challenge);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/mobile/token')
      .send({ code: back.searchParams.get('code'), codeVerifier: verifier })
      .expect(200);
    return res.body.sessionToken as string;
  }

  it("revient dans l'application, puis échange le code contre une session Bearer", async () => {
    const { verifier, challenge } = pkce();
    const back = await browserFlow(challenge);
    expect(`${back.protocol}//${back.host}${back.pathname}`).toBe('devhub://auth/callback');
    const code = back.searchParams.get('code');
    expect(code).toBeTruthy();

    const token = await request(app.getHttpServer())
      .post('/api/v1/auth/mobile/token')
      .send({ code, codeVerifier: verifier })
      .expect(200);
    expect(token.body).toMatchObject({ sessionToken: expect.any(String) });
    expect(new Date(token.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token.body.sessionToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ handle: login, githubLinked: true });
  });

  it("refuse l'échange sans le bon secret PKCE", async () => {
    const { challenge } = pkce();
    const back = await browserFlow(challenge);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/mobile/token')
      .send({ code: back.searchParams.get('code'), codeVerifier: pkce().verifier })
      .expect(401);
    expect(res.body.code).toBe('auth.invalid_code');
  });

  it("renvoie une erreur dans l'application si le défi PKCE manque", async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/github/mobile').expect(302);
    const back = new URL(res.headers.location as string);
    expect(back.protocol).toBe('devhub:');
    expect(back.searchParams.get('error')).toBe('invalid_request');
  });

  it("accepte les écritures de l'application, pas un Bearer sans client déclaré", async () => {
    const token = await signIn();
    await request(app.getHttpServer())
      .post('/api/v1/me/code-of-conduct')
      .set('Authorization', `Bearer ${token}`)
      .set(MOBILE)
      .expect((res) => expect(res.status).toBeLessThan(300));
    const refused = await request(app.getHttpServer())
      .post('/api/v1/me/code-of-conduct')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(refused.body.code).toBe('csrf.origin_rejected');
  });

  it('déconnexion : le jeton Bearer est révoqué', async () => {
    const token = await signIn();
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .set(MOBILE)
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('un Bearer inconnu est refusé', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer inconnu')
      .expect(401);
    expect(res.body.code).toBe('auth.required');
  });
});
