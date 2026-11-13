import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';

// Compte par e-mail et mot de passe contre une vraie base : inscription, /me, connexion, erreurs.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const APP_ORIGIN = 'http://localhost:5173';
const tag = randomBytes(4).toString('hex');
const email = `e2e-${tag}@example.test`;
const displayName = `Awa E2e ${tag}`;
const password = 'une phrase assez longue';
const other = `e2e-autre-${tag}@example.test`;
const ghLogin = `gh-${tag}`;

function sid(res: request.Response): string | undefined {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return raw
    .find((c) => c.startsWith('__Host-sid='))
    ?.slice('__Host-sid='.length)
    .split(';')[0];
}

describe('compte par e-mail', () => {
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
    await prisma.oAuthAccount.deleteMany({ where: { user: { email: { in: [email, other] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, other] } } });
    await app.close();
  });

  const post = (path: string, body: object) =>
    request(app.getHttpServer())
      .post(`/api/v1/auth/email/${path}`)
      .set('Origin', APP_ORIGIN)
      .set('X-DevHub-Client', 'web')
      .send(body);

  it("inscrit, ouvre une session et ne stocke qu'un hash", async () => {
    const res = await post('register', {
      displayName,
      email: email.toUpperCase(),
      password,
    }).expect(204);
    const cookie = sid(res);
    expect(cookie).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', `__Host-sid=${cookie}`)
      .expect(200);
    expect(me.body).toMatchObject({
      displayName,
      email,
      emailVerified: false,
      githubLinked: false,
    });
    expect(me.body.handle).toBe(`awa-e2e-${tag}`);

    const row = await prisma.user.findFirstOrThrow({ where: { email } });
    expect(row.passwordHash).toMatch(/^scrypt\$/);
    expect(row.passwordHash).not.toContain(password);
  });

  it('refuse une deuxième inscription avec la même adresse', async () => {
    const res = await post('register', { displayName: 'Autre', email, password }).expect(409);
    expect(res.body.code).toBe('auth.email_taken');
  });

  it('connecte avec le bon mot de passe, refuse le mauvais', async () => {
    const ok = await post('login', { email, password }).expect(204);
    expect(sid(ok)).toBeDefined();
    const bad = await post('login', { email, password: 'pas le bon' }).expect(401);
    expect(bad.body.code).toBe('auth.bad_credentials');
    expect(sid(bad)).toBeUndefined();
  });

  it('valide les champs et exige l’en-tête anti-CSRF', async () => {
    await post('register', {
      displayName: 'A',
      email: 'pas-une-adresse',
      password: 'court',
    }).expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/email/login')
      .set('Origin', APP_ORIGIN)
      .send({ email, password })
      .expect(403);
  });

  /** Liaison GitHub complète avec le faux fournisseur : renvoie l'adresse de retour finale. */
  async function linkGithub(cookie: string, login: string): Promise<URL> {
    const start = await request(app.getHttpServer())
      .get('/api/v1/auth/github/link')
      .query({ returnTo: '/reglages', login })
      .set('Cookie', cookie)
      .expect(302);
    const callback = new URL(start.headers.location as string);
    const oauth = ([] as string[])
      .concat(start.headers['set-cookie'] ?? [])
      .find((c) => c.startsWith('__Host-oauth='))!
      .split(';')[0]!;
    const done = await request(app.getHttpServer())
      .get(callback.pathname + callback.search)
      .set('Cookie', oauth)
      .expect(302);
    expect(sid(done)).toBeUndefined(); // une liaison n'ouvre pas de nouvelle session
    return new URL(done.headers.location as string);
  }

  it('relie un GitHub au compte e-mail sans changer le pseudo, puis le délie', async () => {
    const login = await post('login', { email, password }).expect(204);
    const cookie = `__Host-sid=${sid(login)}`;

    const anonymous = await request(app.getHttpServer())
      .get('/api/v1/auth/github/link')
      .expect(302);
    expect(anonymous.headers.location).toContain('/connexion?next=%2Freglages');

    const back = await linkGithub(cookie, ghLogin);
    expect(back.pathname).toBe('/reglages');
    expect(back.searchParams.get('github')).toBe('relie');

    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body).toMatchObject({
      handle: `awa-e2e-${tag}`,
      githubLinked: true,
      githubLogin: ghLogin,
      hasPassword: true,
    });
    const passport = await request(app.getHttpServer()).get(`/api/v1/u/awa-e2e-${tag}`).expect(200);
    expect(passport.body.user.githubLogin).toBe(ghLogin);

    // Le même GitHub ne se relie pas à un second compte.
    const reg = await post('register', { displayName: 'Autre compte', email: other, password });
    const otherCookie = `__Host-sid=${sid(reg.status === 204 ? reg : await post('login', { email: other, password }))}`;
    const taken = await linkGithub(otherCookie, ghLogin);
    expect(taken.searchParams.get('github')).toBe('github_taken');

    const unlinked = await request(app.getHttpServer())
      .delete('/api/v1/me/github')
      .set('Origin', APP_ORIGIN)
      .set('X-DevHub-Client', 'web')
      .set('Cookie', cookie)
      .expect(200);
    expect(unlinked.body).toMatchObject({ githubLinked: false, githubLogin: null });
  });
});
