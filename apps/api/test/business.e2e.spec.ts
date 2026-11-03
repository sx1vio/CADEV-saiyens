import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ADMIN_HEADERS, adminSignIn, makeAdmin } from './admin.helper';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, cookieValue, signInAs } from './sign-in.helper';

// Portail entreprise de bout en bout : inscription, validation, offre, candidature, suivi.
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  ADMIN_URL: 'http://localhost:5299',
  BUSINESS_URL: 'http://localhost:5399',
});

const BIZ = { Origin: 'http://localhost:5399', 'X-DevHub-Client': 'business' };
const suffix = randomBytes(4).toString('hex');
const job = (over: Record<string, unknown> = {}) => ({
  title: `Développeur·se Flutter ${suffix}`,
  location: 'Cotonou, Bénin',
  country: 'BJ',
  workMode: 'hybrid',
  contract: 'cdi',
  seniority: 'confirme',
  description:
    'Construire notre application de livraison en Flutter, avec paiement mobile money et mode hors ligne, au sein d’une équipe de quatre devs.',
  tags: ['Flutter', 'Dart'],
  status: 'draft',
  ...over,
});

describe('portail entreprise', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let biz: string;
  let adm: string;
  let dev: string;
  let companyId: string;
  let jobId: string;
  let applicationId: string;
  const http = () => request(app.getHttpServer());
  const asBiz = (m: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string) => {
    const r =
      m === 'get'
        ? http().get(path)
        : m === 'post'
          ? http().post(path)
          : m === 'put'
            ? http().put(path)
            : m === 'patch'
              ? http().patch(path)
              : http().delete(path);
    return r.set(BIZ).set('Cookie', biz);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    dev = await signInAs(app, `dev-biz-${suffix}`);
    await signInAs(app, `adm-biz-${suffix}`);
    adm = await adminSignIn(app, await makeAdmin(prisma, `adm-biz-${suffix}`));
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: suffix } } });
    await app.close();
  });

  it('invisible hors de son origine', async () => {
    await http().get('/api/v1/business/me').expect(404);
    await http().post('/api/v1/business/register').set(WRITE_HEADERS).send({}).expect(404);
  });

  it('inscription : entreprise en attente, publication refusée tant qu’elle n’est pas validée', async () => {
    const res = await http()
      .post('/api/v1/business/register')
      .set(BIZ)
      .send({
        company: {
          name: `Livraisons Express ${suffix}`,
          website: 'https://exemple.bj',
          country: 'BJ',
          city: 'Cotonou',
          sector: 'Logistique',
          size: '11-50',
          about: 'Livraison du dernier kilomètre à Cotonou.',
        },
        account: {
          name: 'Afi Recruteuse',
          email: `rh-${suffix}@exemple.bj`,
          password: 'une phrase solide 2026',
        },
      })
      .expect(204);
    biz = `__Host-dh-biz=${cookieValue(res, '__Host-dh-biz')}`;
    const me = await asBiz('get', '/api/v1/business/me').expect(200);
    expect(me.body.company).toMatchObject({
      status: 'pending',
      slug: expect.stringContaining('livraisons-express'),
    });
    companyId = me.body.company.id;

    const refused = await asBiz('post', '/api/v1/business/jobs')
      .send(job({ status: 'published' }))
      .expect(422);
    expect(refused.body.code).toBe('company.not_verified');
    const draft = await asBiz('post', '/api/v1/business/jobs').send(job()).expect(201);
    jobId = draft.body.id;
    await http().get(`/api/v1/jobs/${jobId}`).expect(404);
  });

  it('validée par l’admin, l’offre publiée apparaît sur /emplois avec candidature sur DevHub', async () => {
    await http()
      .post(`/api/v1/admin/companies/${companyId}/action`)
      .set(ADMIN_HEADERS)
      .set('Cookie', adm)
      .send({ action: 'verify' })
      .expect(204);
    await asBiz('put', `/api/v1/business/jobs/${jobId}`)
      .send(job({ status: 'published' }))
      .expect(200);
    const pub = await http().get(`/api/v1/jobs/${jobId}`).expect(200);
    expect(pub.body).toMatchObject({
      applyUrl: null,
      sourceUrl: null,
      company: `Livraisons Express ${suffix}`,
      companyRef: { id: companyId },
    });
    const page = await http().get(`/api/v1/companies/${pub.body.companyRef.slug}`).expect(200);
    expect(page.body.jobs.map((j: { id: string }) => j.id)).toContain(jobId);
  });

  it('le dev postule ; l’entreprise voit son Passport et change le statut ; le dev est notifié', async () => {
    await http()
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .send({ message: 'Trop court' })
      .set('Cookie', dev)
      .expect(400);
    const msg = 'Je développe en Flutter depuis trois ans, dont une app de livraison hors ligne.';
    await http()
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', dev)
      .send({ message: msg })
      .expect(204);
    await http()
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', dev)
      .send({ message: msg })
      .expect(409);

    const list = await asBiz('get', `/api/v1/business/jobs/${jobId}/applications`).expect(200);
    expect(list.body.data[0]).toMatchObject({
      status: 'submitted',
      message: msg,
      candidate: { handle: `dev-biz-${suffix}` },
    });
    applicationId = list.body.data[0].id;
    const jobs = await asBiz('get', '/api/v1/business/jobs').expect(200);
    expect(jobs.body.data[0]).toMatchObject({ applications: 1, newApplications: 1 });

    await asBiz('patch', `/api/v1/business/applications/${applicationId}`)
      .send({ status: 'interview' })
      .expect(204);
    const mine = await http().get('/api/v1/me/applications').set('Cookie', dev).expect(200);
    expect(mine.body.data[0]).toMatchObject({ status: 'interview', job: { id: jobId } });
    const user = await prisma.user.findFirstOrThrow({ where: { handle: `dev-biz-${suffix}` } });
    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, type: 'application.status' },
    });
    expect(notif?.payload).toMatchObject({ status: 'interview', jobId });
  });

  it('une autre entreprise ne voit pas ces candidatures', async () => {
    const other = await http()
      .post('/api/v1/business/register')
      .set(BIZ)
      .send({
        company: { name: `Autre ${suffix}`, sector: 'Fintech', size: '1-10' },
        account: {
          name: 'Autre',
          email: `autre-${suffix}@exemple.bj`,
          password: 'une phrase solide 2026',
        },
      })
      .expect(204);
    const c = `__Host-dh-biz=${cookieValue(other, '__Host-dh-biz')}`;
    await http()
      .get(`/api/v1/business/jobs/${jobId}/applications`)
      .set(BIZ)
      .set('Cookie', c)
      .expect(404);
    await http()
      .patch(`/api/v1/business/applications/${applicationId}`)
      .set(BIZ)
      .set('Cookie', c)
      .send({ status: 'hired' })
      .expect(404);
  });

  it('suspendue : ses offres disparaissent et ses sessions sont fermées', async () => {
    await http()
      .post(`/api/v1/admin/companies/${companyId}/action`)
      .set(ADMIN_HEADERS)
      .set('Cookie', adm)
      .send({ action: 'suspend', reason: 'Vérification en cours' })
      .expect(204);
    await http().get(`/api/v1/jobs/${jobId}`).expect(404);
    await asBiz('get', '/api/v1/business/me').expect(404);
    const audit = await prisma.adminAction.findMany({ where: { targetId: companyId } });
    expect(audit.map((a) => a.action).sort()).toEqual(['company_suspend', 'company_verify']);
  });
});
