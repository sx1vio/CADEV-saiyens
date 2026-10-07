import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';

// Parcours A1 complet contre une vraie base (migrations appliquées), avec le faux fournisseur GitHub.
// La configuration est lue à la création du module : applyTestEnv doit passer avant.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const APP_ORIGIN = 'http://localhost:5173';
const login = `e2e-${randomBytes(4).toString('hex')}`;

function cookieValue(res: request.Response, name: string): string | undefined {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const line = raw.find((c) => c.startsWith(`${name}=`));
  return line?.slice(name.length + 1).split(';')[0];
}

describe('connexion GitHub (A1)', () => {
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

  async function signIn(returnTo = '/sos/42'): Promise<{ sid: string; location: string }> {
    const start = await request(app.getHttpServer())
      .get('/api/v1/auth/github')
      .query({ login, returnTo })
      .expect(302);
    const oauthCookie = cookieValue(start, '__Host-oauth');
    expect(oauthCookie).toBeDefined();
    const callback = new URL(start.headers.location as string);
    expect(callback.pathname).toBe('/api/v1/auth/github/callback');

    const done = await request(app.getHttpServer())
      .get(callback.pathname + callback.search)
      .set('Cookie', `__Host-oauth=${oauthCookie}`)
      .expect(302);
    const sid = cookieValue(done, '__Host-sid');
    expect(sid).toBeDefined();
    expect(([] as string[]).concat(done.headers['set-cookie'] ?? []).join(';')).toMatch(
      /HttpOnly/i,
    );
    return { sid: sid!, location: done.headers.location as string };
  }

  it('crée le compte, ouvre une session et revient sur la page demandée', async () => {
    const { sid, location } = await signIn();
    expect(location).toBe(`${APP_ORIGIN}/sos/42`);

    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', `__Host-sid=${sid}`)
      .expect(200);
    expect(me.body).toMatchObject({
      handle: login,
      displayName: login,
      email: `${login}@example.test`,
      emailVerified: true,
      githubLinked: true,
      isDemo: false,
    });
  });

  it('stocke le jeton GitHub chiffré et seulement l’empreinte de la session', async () => {
    const { sid } = await signIn();
    const user = await prisma.user.findUniqueOrThrow({
      where: { handle: login },
      include: { oauthAccounts: true, sessions: true },
    });
    expect(user.oauthAccounts).toHaveLength(1);
    expect(Buffer.from(user.oauthAccounts[0]!.accessTokenEnc!).toString('utf8')).not.toContain(
      'fake-token',
    );
    expect(user.oauthAccounts[0]!.scopes).toEqual(['read:user', 'user:email']);
    expect(user.sessions.map((s) => s.id)).not.toContain(sid);
  });

  it('retrouve le même compte à la connexion suivante', async () => {
    await signIn();
    expect(await prisma.user.count({ where: { handle: { startsWith: login } } })).toBe(1);
  });

  it('refuse un state falsifié et renvoie vers la page de connexion', async () => {
    const start = await request(app.getHttpServer())
      .get('/api/v1/auth/github')
      .query({ login })
      .expect(302);
    const callback = new URL(start.headers.location as string);
    callback.searchParams.set('state', 'falsifie');
    const res = await request(app.getHttpServer())
      .get(callback.pathname + callback.search)
      .set('Cookie', `__Host-oauth=${cookieValue(start, '__Host-oauth')}`)
      .expect(302);
    expect(res.headers.location).toBe(`${APP_ORIGIN}/connexion?erreur=invalid_state`);
    expect(cookieValue(res, '__Host-sid')).toBeUndefined();
  });

  it('ignore une redirection externe dans returnTo', async () => {
    const { location } = await signIn('https://evil.test');
    expect(location).toBe(`${APP_ORIGIN}/`);
  });

  it('GET /me sans session renvoie un problem+json 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/me').expect(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.code).toBe('auth.required');
  });

  it('refuse une déconnexion venant d’une autre origine (CSRF)', async () => {
    const { sid } = await signIn();
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `__Host-sid=${sid}`)
      .set('Origin', 'https://evil.test')
      .set('X-DevHub-Client', 'web')
      .expect(403);
    expect(res.body.code).toBe('csrf.origin_rejected');
  });

  it('déconnecte : la session est révoquée et le cookie effacé', async () => {
    const { sid } = await signIn();
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `__Host-sid=${sid}`)
      .set('Origin', APP_ORIGIN)
      .set('X-DevHub-Client', 'web')
      .expect(204);
    expect(cookieValue(res, '__Host-sid')).toBe('');
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', `__Host-sid=${sid}`)
      .expect(401);
  });
});
