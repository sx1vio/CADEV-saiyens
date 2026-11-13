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

  it('candidature complète : CV PDF privé, e-mail partagé avec accord, liens, mot de l’entreprise', async () => {
    const dev2 = await signInAs(app, `dev2-biz-${suffix}`);
    const user2 = await prisma.user.findFirstOrThrow({ where: { handle: `dev2-biz-${suffix}` } });
    await prisma.user.update({
      where: { id: user2.id },
      data: { email: `dev2-${suffix}@exemple.bj` },
    });
    // Pas un PDF : refusé.
    await http()
      .post('/api/v1/me/cv?name=cv.pdf')
      .set(WRITE_HEADERS)
      .set('Content-Type', 'application/pdf')
      .set('Cookie', dev2)
      .send(Buffer.from('<html>pas un pdf</html>'))
      .expect(422);
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    const up = await http()
      .post('/api/v1/me/cv?name=Mon CV <script>.pdf')
      .set(WRITE_HEADERS)
      .set('Content-Type', 'application/pdf')
      .set('Cookie', dev2)
      .send(pdf)
      .expect(201);
    expect(up.body).toMatchObject({ name: 'Mon CV script.pdf', size: pdf.length });
    // Le CV d'un autre ne peut pas être joint.
    await http()
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', dev)
      .send({ message: 'x'.repeat(40), cvId: up.body.id })
      .expect((r) => expect([409, 422]).toContain(r.status));
    await http()
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', dev2)
      .send({
        message: 'Trois ans de Flutter en production, dont une app de paiement mobile money.',
        shareEmail: true,
        links: ['https://github.com/exemple/livraison'],
        cvId: up.body.id,
      })
      .expect(204);
    const list = await asBiz('get', `/api/v1/business/jobs/${jobId}/applications`).expect(200);
    const mine = list.body.data.find(
      (a: { candidate: { handle: string } }) => a.candidate.handle === `dev2-biz-${suffix}`,
    );
    expect(mine).toMatchObject({
      contactEmail: `dev2-${suffix}@exemple.bj`,
      links: ['https://github.com/exemple/livraison'],
      cv: { name: 'Mon CV script.pdf', size: pdf.length },
    });
    // Le premier candidat n'a pas partagé son e-mail.
    const first = list.body.data.find((a: { id: string }) => a.id === applicationId);
    expect(first).toMatchObject({ contactEmail: null, cv: null });
    const file = await asBiz('get', `/api/v1/business/applications/${mine.id}/cv`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.headers['content-disposition']).toContain('attachment');
    expect(Buffer.compare(file.body as Buffer, pdf)).toBe(0);
    // Le CV reste privé : un autre dev ne le lit pas.
    await http().get(`/api/v1/me/cv/${up.body.id}`).set('Cookie', dev).expect(404);
    await http().get(`/api/v1/me/cv/${up.body.id}`).set('Cookie', dev2).expect(200);

    await asBiz('patch', `/api/v1/business/applications/${mine.id}`)
      .send({
        status: 'interview',
        note: 'Entretien jeudi 10 h, en visio. Lien envoyé par e-mail.',
      })
      .expect(204);
    const back = await http().get('/api/v1/me/applications').set('Cookie', dev2).expect(200);
    expect(back.body.data[0]).toMatchObject({
      status: 'interview',
      note: 'Entretien jeudi 10 h, en visio. Lien envoyé par e-mail.',
      emailShared: true,
      cv: { name: 'Mon CV script.pdf' },
    });
  });

  it('une offre externe se postule chez son éditeur, pas sur DevHub', async () => {
    const ext = await prisma.jobOffer.create({
      data: {
        title: `Offre externe ${suffix}`,
        company: 'Ailleurs',
        location: 'Dakar',
        workMode: 'remote',
        contract: 'cdi',
        seniority: 'junior',
        description: 'Offre publiée par l’équipe avec un lien officiel.',
        applyUrl: 'https://exemple.sn/carrieres/1',
        status: 'published',
        publishedAt: new Date(),
      },
    });
    const r = await http()
      .post(`/api/v1/jobs/${ext.id}/apply`)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', dev)
      .send({ message: 'x'.repeat(40) })
      .expect(422);
    expect(r.body).toMatchObject({
      code: 'job.external',
      detail: 'https://exemple.sn/carrieres/1',
    });
    await prisma.jobOffer.delete({ where: { id: ext.id } });
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
