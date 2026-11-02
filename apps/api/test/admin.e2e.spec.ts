import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { totpAt } from '../src/modules/backoffice/domain/totp';
import { ADMIN_HEADERS, type AdminAccount, adminSignIn, makeAdmin } from './admin.helper';
import { applyTestEnv } from './env.fixture';
import { APP_ORIGIN, WRITE_HEADERS, signInAs } from './sign-in.helper';

// Espace d'administration : invisible sans double facteur, offres d'emploi publiées par l'admin.
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  ADMIN_URL: 'http://localhost:5299',
});

const suffix = randomBytes(4).toString('hex');

const job = (over: Record<string, unknown> = {}) => ({
  title: `Développeur·se back-end Node.js ${suffix}`,
  company: 'Exemple SA',
  companyUrl: 'https://exemple.com',
  location: 'Dakar, Sénégal',
  country: 'SN',
  workMode: 'hybrid',
  contract: 'cdi',
  seniority: 'confirme',
  salary: null,
  description:
    'Concevoir et maintenir les API de paiement, avec Node.js, PostgreSQL et des tests automatisés.',
  applyUrl: 'https://exemple.com/carrieres/backend',
  sourceUrl: 'https://exemple.com/carrieres/backend',
  tags: ['Node.js', 'PostgreSQL'],
  expiresAt: null,
  status: 'draft',
  ...over,
});

describe('espace d’administration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: AdminAccount;
  let adminCookie: string;
  let memberCookie: string;
  let adminSiteCookie: string;
  const adminHandle = `boss-${suffix}`;

  const asAdmin = (method: 'get' | 'post' | 'put' | 'delete', path: string, cookie = adminCookie) =>
    request(app.getHttpServer())[method](path).set(ADMIN_HEADERS).set('Cookie', cookie);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    memberCookie = await signInAs(app, `member-${suffix}`);
    // Session de membre ouverte avant la promotion (une connexion GitHub réécrirait l'e-mail).
    adminSiteCookie = await signInAs(app, adminHandle);
    admin = await makeAdmin(prisma, adminHandle);
  });

  afterAll(async () => {
    await prisma.jobOffer.deleteMany({ where: { title: { contains: suffix } } });
    await app.close();
  });

  it('sans session d’administration, tout répond 404 (même pour un membre ou un admin connecté au site)', async () => {
    for (const path of ['/api/v1/admin/overview', '/api/v1/admin/jobs', '/api/v1/admin/reports']) {
      expect((await request(app.getHttpServer()).get(path).expect(404)).body.code).toBe(
        'not_found',
      );
      await request(app.getHttpServer()).get(path).set('Cookie', memberCookie).expect(404);
      await asAdmin('get', path, 'x=y').expect(404);
    }
    await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Cookie', adminSiteCookie)
      .expect(404);
  });

  it('connexion : depuis l’origine du site → 404 ; mauvais code → 401 ; bon code → cookie strict', async () => {
    const body = {
      email: admin.email,
      password: admin.password,
      code: totpAt(admin.secret, new Date()),
    };
    await request(app.getHttpServer())
      .post('/api/v1/admin/session')
      .set(WRITE_HEADERS)
      .send(body)
      .expect(404);
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/admin/session')
      .set(ADMIN_HEADERS)
      .send({ ...body, code: body.code === '000000' ? '111111' : '000000' })
      .expect(401);
    expect(wrong.body.code).toBe('admin.bad_credentials');
    await request(app.getHttpServer())
      .post('/api/v1/admin/session')
      .set(ADMIN_HEADERS)
      .send({ ...body, password: 'pas le bon mot de passe' })
      .expect(401);

    const ok = await request(app.getHttpServer())
      .post('/api/v1/admin/session')
      .set(ADMIN_HEADERS)
      .send(body)
      .expect(204);
    const raw = ([] as string[]).concat(ok.headers['set-cookie'] ?? []).join(';');
    expect(raw).toMatch(/__Host-dh-adm=/);
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Strict/i);
    adminCookie = `__Host-dh-adm=${/__Host-dh-adm=([^;]+)/.exec(raw)![1]}`;

    // Le même code ne sert pas deux fois.
    await request(app.getHttpServer())
      .post('/api/v1/admin/session')
      .set(ADMIN_HEADERS)
      .send(body)
      .expect(401);

    const me = await asAdmin('get', '/api/v1/admin/session').expect(200);
    expect(me.body.handle).toBe(adminHandle);
    const audit = await prisma.adminAction.findFirst({
      where: { action: 'admin_sign_in', admin: { handle: adminHandle } },
    });
    expect(audit).not.toBeNull();
  });

  it('une requête venue d’une autre origine est refusée, et le CORS n’autorise jamais le site', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('X-DevHub-Client', 'admin')
      .set('Origin', APP_ORIGIN)
      .set('Cookie', adminCookie)
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Cookie', adminCookie)
      .expect(404);
    const overview = await asAdmin('get', '/api/v1/admin/overview').expect(200);
    expect(overview.body).toMatchObject({
      users: expect.any(Number),
      publishedJobs: expect.any(Number),
    });
  });

  it('offres : un brouillon reste privé, une offre publiée est publique, une offre expirée disparaît', async () => {
    const draft = await asAdmin('post', '/api/v1/admin/jobs').send(job()).expect(201);
    expect(draft.body).toMatchObject({ status: 'draft', publishedAt: null });
    let pub = await request(app.getHttpServer()).get('/api/v1/jobs').expect(200);
    expect(pub.body.data.map((j: { id: string }) => j.id)).not.toContain(draft.body.id);

    const published = await asAdmin('put', `/api/v1/admin/jobs/${draft.body.id}`)
      .send(job({ status: 'published' }))
      .expect(200);
    expect(published.body.publishedAt).not.toBeNull();
    pub = await request(app.getHttpServer()).get('/api/v1/jobs').expect(200);
    expect(pub.body.data.find((j: { id: string }) => j.id === draft.body.id)).toMatchObject({
      company: 'Exemple SA',
      sourceUrl: 'https://exemple.com/carrieres/backend',
    });
    await request(app.getHttpServer()).get(`/api/v1/jobs/${draft.body.id}`).expect(200);

    await asAdmin('put', `/api/v1/admin/jobs/${draft.body.id}`)
      .send(job({ status: 'published', expiresAt: new Date(Date.now() - 1000).toISOString() }))
      .expect(200);
    await request(app.getHttpServer()).get(`/api/v1/jobs/${draft.body.id}`).expect(404);

    // Un lien de candidature doit être https:// ou mailto:
    await asAdmin('post', '/api/v1/admin/jobs')
      .send(job({ applyUrl: 'javascript:alert(1)' }))
      .expect(400);

    await asAdmin('delete', `/api/v1/admin/jobs/${draft.body.id}`).expect(204);
    const actions = await prisma.adminAction.findMany({
      where: { targetId: draft.body.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(actions.map((a) => a.action)).toEqual([
      'job_create',
      'job_update',
      'job_update',
      'job_delete',
    ]);
  });

  it('retirer le droit d’administrateur ferme aussitôt l’accès ; la déconnexion aussi', async () => {
    const second = await (async () => {
      await new Promise((r) => setTimeout(r, 31_000 - (Date.now() % 30_000)));
      return adminSignIn(app, admin);
    })();
    await asAdmin('delete', '/api/v1/admin/session', second).expect(204);
    await asAdmin('get', '/api/v1/admin/session', second).expect(404);

    await prisma.user.update({ where: { handle: adminHandle }, data: { isAdmin: false } });
    await asAdmin('get', '/api/v1/admin/overview').expect(404);
  }, 45_000);
});
