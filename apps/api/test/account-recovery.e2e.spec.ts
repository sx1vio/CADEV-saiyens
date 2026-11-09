import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { MAILER, type MailMessage } from '../src/infrastructure/mail/mailer';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ADMIN_HEADERS, adminSignIn, makeAdmin } from './admin.helper';
import { applyTestEnv } from './env.fixture';
import { APP_ORIGIN, WRITE_HEADERS, cookieValue, signInAs } from './sign-in.helper';

// Mot de passe oublié (devs et recruteurs), changement de mot de passe, équipe de recruteurs,
// dernières candidatures du portail entreprise.
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  ADMIN_URL: 'http://localhost:5299',
  BUSINESS_URL: 'http://localhost:5399',
});

const BIZ = { Origin: 'http://localhost:5399', 'X-DevHub-Client': 'business' };
const suffix = randomBytes(4).toString('hex');
const sent: MailMessage[] = [];
const lastMailTo = (to: string) => [...sent].reverse().find((m) => m.to === to);
/** Jeton du lien reçu : dans le fragment de l'URL (#jeton ou #reinitialiser=jeton). */
const tokenIn = (m: MailMessage | undefined) => {
  const url = m?.text.split('\n').find((l) => l.startsWith('http'));
  return new URL(url!).hash.replace(/^#(reinitialiser=)?/, '');
};

describe('récupération de compte et équipe', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER)
      .useValue({ configured: true, send: async (m: MailMessage) => void sent.push(m) })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: suffix } } });
    await app.close();
  });

  describe('dev inscrit par e-mail', () => {
    const email = `oubli-${suffix}@example.test`;
    let oldCookie: string;

    beforeAll(async () => {
      const res = await http()
        .post('/api/v1/auth/email/register')
        .set(WRITE_HEADERS)
        .send({ displayName: 'Kofi Oubli', email, password: 'ancien mot de passe' })
        .expect(204);
      oldCookie = `__Host-sid=${cookieValue(res, '__Host-sid')}`;
    });

    it('adresse inconnue : 204 aussi, et aucun e-mail', async () => {
      const before = sent.length;
      await http()
        .post('/api/v1/auth/email/forgot')
        .set(WRITE_HEADERS)
        .send({ email: `personne-${suffix}@example.test` })
        .expect(204);
      expect(sent.length).toBe(before);
    });

    it('lien par e-mail, nouveau mot de passe, anciennes sessions fermées, lien à usage unique', async () => {
      await http().post('/api/v1/auth/email/forgot').set(WRITE_HEADERS).send({ email }).expect(204);
      const mail = lastMailTo(email);
      expect(mail?.text).toContain(`${APP_ORIGIN}/mot-de-passe#`);
      expect(mail?.unsubscribeUrl).toBeUndefined();
      const token = tokenIn(mail);
      // Seul le haché est en base.
      expect(await prisma.passwordReset.count({ where: { tokenHash: token } })).toBe(0);

      await http()
        .post('/api/v1/auth/email/reset')
        .set(WRITE_HEADERS)
        .send({ token, password: 'nouveau mot de passe' })
        .expect(204);
      await http().get('/api/v1/me').set('Cookie', oldCookie).expect(401);
      await http()
        .post('/api/v1/auth/email/login')
        .set(WRITE_HEADERS)
        .send({ email, password: 'ancien mot de passe' })
        .expect(401);
      await http()
        .post('/api/v1/auth/email/login')
        .set(WRITE_HEADERS)
        .send({ email, password: 'nouveau mot de passe' })
        .expect(204);
      const again = await http()
        .post('/api/v1/auth/email/reset')
        .set(WRITE_HEADERS)
        .send({ token, password: 'encore un autre' })
        .expect(400);
      expect(again.body.code).toBe('auth.reset_invalid');
    });

    it('un nouveau lien annule le précédent ; un lien expiré est refusé', async () => {
      await http().post('/api/v1/auth/email/forgot').set(WRITE_HEADERS).send({ email }).expect(204);
      const first = tokenIn(lastMailTo(email));
      await http().post('/api/v1/auth/email/forgot').set(WRITE_HEADERS).send({ email }).expect(204);
      const second = tokenIn(lastMailTo(email));
      await http()
        .post('/api/v1/auth/email/reset')
        .set(WRITE_HEADERS)
        .send({ token: first, password: 'mot de passe 3' })
        .expect(400);
      await prisma.passwordReset.updateMany({
        where: { usedAt: null, kind: 'user' },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await http()
        .post('/api/v1/auth/email/reset')
        .set(WRITE_HEADERS)
        .send({ token: second, password: 'mot de passe 3' })
        .expect(400);
    });
  });

  describe('portail entreprise', () => {
    const owner = `patron-${suffix}@exemple.bj`;
    const recruiterEmail = `rh2-${suffix}@exemple.bj`;
    let ownerCookie: string;
    let companyId: string;
    let jobId: string;
    const asBiz = (cookie: string) => ({
      get: (p: string) => http().get(p).set(BIZ).set('Cookie', cookie),
      post: (p: string) => http().post(p).set(BIZ).set('Cookie', cookie),
      put: (p: string) => http().put(p).set(BIZ).set('Cookie', cookie),
      delete: (p: string) => http().delete(p).set(BIZ).set('Cookie', cookie),
    });
    const login = async (email: string, password: string, status = 204) => {
      const res = await http()
        .post('/api/v1/business/session')
        .set(BIZ)
        .send({ email, password })
        .expect(status);
      return status === 204 ? `__Host-dh-biz=${cookieValue(res, '__Host-dh-biz')}` : '';
    };

    beforeAll(async () => {
      const res = await http()
        .post('/api/v1/business/register')
        .set(BIZ)
        .send({
          company: { name: `Kora Tech ${suffix}`, sector: 'Logiciel', size: '1-10' },
          account: { name: 'Ama Patronne', email: owner, password: 'phrase du patron 2026' },
        })
        .expect(204);
      ownerCookie = `__Host-dh-biz=${cookieValue(res, '__Host-dh-biz')}`;
      companyId = (await asBiz(ownerCookie).get('/api/v1/business/me').expect(200)).body.company.id;
    });

    it('mot de passe oublié : lien vers le portail, ancien mot de passe refusé ensuite', async () => {
      await http()
        .post('/api/v1/business/password/forgot')
        .set(BIZ)
        .send({ email: owner })
        .expect(204);
      const mail = lastMailTo(owner);
      expect(mail?.text).toContain('http://localhost:5399/#reinitialiser=');
      expect(mail?.text).toContain('Vous avez demandé');
      const token = tokenIn(mail);
      // Trop court pour un recruteur : refusé sans consommer le lien.
      await http()
        .post('/api/v1/business/password/reset')
        .set(BIZ)
        .send({ token, password: 'court1234' })
        .expect(400);
      await http()
        .post('/api/v1/business/password/reset')
        .set(BIZ)
        .send({ token, password: 'nouvelle phrase patron' })
        .expect(204);
      await asBiz(ownerCookie).get('/api/v1/business/me').expect(404);
      await login(owner, 'phrase du patron 2026', 401);
      ownerCookie = await login(owner, 'nouvelle phrase patron');
      // Hors de l'origine du portail : invisible.
      await http()
        .post('/api/v1/business/password/forgot')
        .set(WRITE_HEADERS)
        .send({ email: owner })
        .expect(404);
    });

    it('changer son mot de passe : l’actuel est exigé, les autres sessions sont fermées', async () => {
      const other = await login(owner, 'nouvelle phrase patron');
      await asBiz(ownerCookie)
        .put('/api/v1/business/account/password')
        .send({ current: 'faux', password: 'troisième phrase patron' })
        .expect(401);
      await asBiz(ownerCookie)
        .put('/api/v1/business/account/password')
        .send({ current: 'nouvelle phrase patron', password: 'troisième phrase patron' })
        .expect(204);
      await asBiz(ownerCookie).get('/api/v1/business/me').expect(200);
      await asBiz(other).get('/api/v1/business/me').expect(404);
    });

    it('équipe : le propriétaire ajoute puis retire un recruteur ; le recruteur ne gère pas l’équipe', async () => {
      const invited = await asBiz(ownerCookie)
        .post('/api/v1/business/team')
        .send({ name: 'Yao Recruteur', email: recruiterEmail })
        .expect(201);
      expect(invited.body.member).toMatchObject({ role: 'recruiter', email: recruiterEmail });
      expect(invited.body.password).toHaveLength(16);
      await asBiz(ownerCookie)
        .post('/api/v1/business/team')
        .send({ name: 'Doublon', email: owner })
        .expect(409);

      const rec = await login(recruiterEmail, invited.body.password);
      const team = await asBiz(rec).get('/api/v1/business/team').expect(200);
      expect(team.body.data.map((m: { email: string }) => m.email)).toEqual([
        owner,
        recruiterEmail,
      ]);
      const denied = await asBiz(rec)
        .post('/api/v1/business/team')
        .send({ name: 'Autre', email: `x-${suffix}@exemple.bj` })
        .expect(403);
      expect(denied.body.code).toBe('business.owner_only');

      await asBiz(ownerCookie)
        .delete(`/api/v1/business/team/${invited.body.member.id}`)
        .expect(204);
      await asBiz(rec).get('/api/v1/business/me').expect(404);
      await login(recruiterEmail, invited.body.password, 401);
      // Le propriétaire ne peut pas se retirer lui-même.
      const me = await asBiz(ownerCookie).get('/api/v1/business/me').expect(200);
      await asBiz(ownerCookie).delete(`/api/v1/business/team/${me.body.account.id}`).expect(404);
      // Réinvité, le même recruteur retrouve un compte actif.
      const back = await asBiz(ownerCookie)
        .post('/api/v1/business/team')
        .send({ name: 'Yao Recruteur', email: recruiterEmail })
        .expect(201);
      await login(recruiterEmail, back.body.password);
    });

    it('dernières candidatures, toutes offres confondues, avec le titre de l’offre', async () => {
      const adm = await (async () => {
        await signInAs(app, `adm-rec-${suffix}`);
        return adminSignIn(app, await makeAdmin(prisma, `adm-rec-${suffix}`));
      })();
      await http()
        .post(`/api/v1/admin/companies/${companyId}/action`)
        .set(ADMIN_HEADERS)
        .set('Cookie', adm)
        .send({ action: 'verify' })
        .expect(204);
      const created = await asBiz(ownerCookie)
        .post('/api/v1/business/jobs')
        .send({
          title: `Dev React ${suffix}`,
          location: 'Lomé, Togo',
          country: 'TG',
          workMode: 'remote',
          contract: 'cdi',
          seniority: 'junior',
          description:
            'Construire le tableau de bord de nos marchands en React et TypeScript, avec une API Node.js et des tests.',
          tags: ['React'],
          status: 'published',
        })
        .expect(201);
      jobId = created.body.id;
      const dev = await signInAs(app, `cand-${suffix}`);
      await http()
        .post(`/api/v1/jobs/${jobId}/apply`)
        .set(WRITE_HEADERS)
        .set('Idempotency-Key', randomUUID())
        .set('Cookie', dev)
        .send({
          message: 'Trois ans de React et TypeScript, dont deux tableaux de bord marchands.',
        })
        .expect(204);
      const recent = await asBiz(ownerCookie)
        .get('/api/v1/business/applications?limit=5')
        .expect(200);
      expect(recent.body.data[0]).toMatchObject({
        jobId,
        jobTitle: `Dev React ${suffix}`,
        candidate: { handle: `cand-${suffix}` },
      });
    });
  });
});
