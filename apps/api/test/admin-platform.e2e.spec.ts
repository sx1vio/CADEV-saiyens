import { randomBytes } from 'node:crypto';
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

// Administration complète : comptes, contenus, activité, statistiques, annonces, admins.
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  ADMIN_URL: 'http://localhost:5299',
});

const suffix = randomBytes(4).toString('hex');

describe('administration complète', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdm: string;
  let modAdm: string;
  let dev: string;
  let devId: string;
  let postId: string;
  const http = () => request(app.getHttpServer());
  const as = (cookie: string) => ({
    get: (p: string) => http().get(p).set(ADMIN_HEADERS).set('Cookie', cookie),
    post: (p: string) => http().post(p).set(ADMIN_HEADERS).set('Cookie', cookie),
    put: (p: string) => http().put(p).set(ADMIN_HEADERS).set('Cookie', cookie),
    patch: (p: string) => http().patch(p).set(ADMIN_HEADERS).set('Cookie', cookie),
    delete: (p: string) => http().delete(p).set(ADMIN_HEADERS).set('Cookie', cookie),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    dev = await signInAs(app, `dev-adm-${suffix}`);
    devId = (await prisma.user.findUniqueOrThrow({ where: { handle: `dev-adm-${suffix}` } })).id;
    await signInAs(app, `sup-adm-${suffix}`);
    await signInAs(app, `mod-adm-${suffix}`);
    superAdm = await adminSignIn(app, await makeAdmin(prisma, `sup-adm-${suffix}`));
    const mod = await makeAdmin(prisma, `mod-adm-${suffix}`);
    await prisma.user.update({
      where: { handle: `mod-adm-${suffix}` },
      data: { adminRole: 'moderator' },
    });
    modAdm = await adminSignIn(app, mod);
    postId = (
      await prisma.post.create({
        data: {
          authorId: devId,
          community: 'general',
          kind: 'discussion',
          title: `Sujet à modérer ${suffix}`,
          body: 'Un contenu publié par un membre.',
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.announcement.deleteMany({ where: { message: { contains: suffix } } });
    await prisma.post.deleteMany({ where: { title: { contains: suffix } } });
    await app.close();
  });

  it('tout est invisible sans session d’administration', async () => {
    for (const p of [
      'users',
      'content?type=post',
      'activity',
      'stats',
      'feeds',
      'admins',
      'announcements',
    ])
      await http().get(`/api/v1/admin/${p}`).set(ADMIN_HEADERS).expect(404);
    await http().get('/api/v1/admin/users').set('Cookie', superAdm).expect(404);
  });

  it('la session indique le rôle', async () => {
    expect((await as(superAdm).get('/api/v1/admin/session').expect(200)).body.role).toBe('super');
    expect((await as(modAdm).get('/api/v1/admin/session').expect(200)).body.role).toBe('moderator');
  });

  it('utilisateurs : recherche, suspension (sessions fermées), réactivation, démo', async () => {
    const list = await as(modAdm).get(`/api/v1/admin/users?q=dev-adm-${suffix}`).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.data[0]).toMatchObject({ handle: `dev-adm-${suffix}`, stats: { posts: 1 } });

    await as(modAdm)
      .post(`/api/v1/admin/users/${devId}/action`)
      .send({ action: 'suspend' })
      .expect(400);
    await as(modAdm)
      .post(`/api/v1/admin/users/${devId}/action`)
      .send({ action: 'suspend', reason: 'spam répété' })
      .expect(204);
    await http().get('/api/v1/me').set('Cookie', dev).expect(401);
    // Reconnexion refusée avec un message dédié, sans session ouverte.
    const start = await http()
      .get('/api/v1/auth/github')
      .query({ login: `dev-adm-${suffix}` })
      .expect(302);
    const cb = new URL(start.headers.location as string);
    const done = await http()
      .get(cb.pathname + cb.search)
      .set('Cookie', `__Host-oauth=${cookieValue(start, '__Host-oauth')}`)
      .expect(302);
    expect(done.headers.location).toContain('erreur=suspended');
    expect(cookieValue(done, '__Host-sid')).toBeUndefined();
    const suspended = await as(modAdm).get('/api/v1/admin/users?filter=suspended').expect(200);
    expect(suspended.body.data.map((u: { id: string }) => u.id)).toContain(devId);

    await as(modAdm)
      .post(`/api/v1/admin/users/${devId}/action`)
      .send({ action: 'unsuspend' })
      .expect(204);
    await as(modAdm)
      .post(`/api/v1/admin/users/${devId}/action`)
      .send({ action: 'mark_demo' })
      .expect(204);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: devId } })).isDemo).toBe(true);
    await as(modAdm)
      .post(`/api/v1/admin/users/${devId}/action`)
      .send({ action: 'unmark_demo' })
      .expect(204);

    // Un modérateur ne supprime pas de compte ; un admin ne se suspend pas d'ici.
    await as(modAdm)
      .post(`/api/v1/admin/users/${devId}/action`)
      .send({ action: 'delete' })
      .expect(403);
    const supId = (await prisma.user.findUniqueOrThrow({ where: { handle: `sup-adm-${suffix}` } }))
      .id;
    await as(modAdm)
      .post(`/api/v1/admin/users/${supId}/action`)
      .send({ action: 'suspend', reason: 'essai' })
      .expect(409);
    const audit = await prisma.adminAction.findMany({ where: { targetId: devId } });
    expect(audit.map((a) => a.action)).toEqual(
      expect.arrayContaining(['user_suspend', 'user_unsuspend', 'flag_demo', 'unflag_demo']),
    );
  });

  it('contenus : lister, masquer puis rétablir une publication', async () => {
    const list = await as(modAdm).get(`/api/v1/admin/content?type=post&q=${suffix}`).expect(200);
    expect(list.body.data[0]).toMatchObject({ id: postId, hidden: false, path: `/post/${postId}` });
    await as(modAdm)
      .post(`/api/v1/admin/content/post/${postId}`)
      .send({ action: 'hide', reason: 'hors sujet' })
      .expect(204);
    await http().get(`/api/v1/posts/${postId}`).expect(404);
    const hidden = await as(modAdm)
      .get(`/api/v1/admin/content?type=post&state=hidden&q=${suffix}`)
      .expect(200);
    expect(hidden.body.data).toHaveLength(1);
    await as(modAdm)
      .post(`/api/v1/admin/content/post/${postId}`)
      .send({ action: 'restore', reason: 'erreur' })
      .expect(204);
    await as(modAdm)
      .post(`/api/v1/admin/content/nope/${postId}`)
      .send({ action: 'hide', reason: 'essai' })
      .expect(404);
  });

  it('activité, statistiques et flux', async () => {
    const act = await as(modAdm).get('/api/v1/admin/activity').expect(200);
    expect(
      act.body.data.some((i: { label: string }) => i.label.includes(`Sujet à modérer ${suffix}`)),
    ).toBe(true);
    const stats = await as(modAdm).get('/api/v1/admin/stats').expect(200);
    expect(stats.body.days).toHaveLength(30);
    expect(stats.body.days.at(-1).posts).toBeGreaterThanOrEqual(1);
    const feeds = await as(modAdm).get('/api/v1/admin/feeds').expect(200);
    expect(Array.isArray(feeds.body.runs)).toBe(true);
  });

  it('tableau de bord Systalink et modération du Banc d’essai', async () => {
    const before = await as(modAdm).get('/api/v1/admin/systalink').expect(200);
    expect(before.body.referrals.days).toHaveLength(30);
    expect(before.body).toMatchObject({
      deployments: { items: expect.any(Array) },
      preflight: { reports: expect.any(Number) },
      bench: { requests: expect.any(Number) },
    });

    const owner = await prisma.user.findFirstOrThrow({ select: { id: true } });
    const bench = await prisma.benchRequest.create({
      data: {
        authorId: owner.id,
        title: `Banc à modérer ${suffix}`,
        appUrl: 'https://example.test',
        instructions: 'Ouvrir la page et suivre le parcours de paiement.',
        devices: ['android_low'],
        networks: ['3g'],
      },
    });
    const list = await as(modAdm)
      .get(`/api/v1/admin/content?type=bench_request&q=${suffix}`)
      .expect(200);
    expect(list.body.data[0]).toMatchObject({ id: bench.id, path: `/banc/${bench.id}` });
    await as(modAdm)
      .post(`/api/v1/admin/content/bench_request/${bench.id}`)
      .send({ action: 'hide', reason: 'lien trompeur' })
      .expect(204);
    await http().get(`/api/v1/bench/${bench.id}`).expect(404);
  });

  it('annonces : publiées par l’admin, visibles sur le site pendant leur période', async () => {
    const created = await as(modAdm)
      .post('/api/v1/admin/announcements')
      .send({
        message: `Maintenance ce soir ${suffix}`,
        level: 'warning',
        linkUrl: '/regles',
        linkLabel: 'Détails',
      })
      .expect(201);
    let pub = await http().get('/api/v1/announcements').expect(200);
    expect(pub.body.data.some((a: { message: string }) => a.message.includes(suffix))).toBe(true);
    await as(modAdm)
      .put(`/api/v1/admin/announcements/${created.body.id}`)
      .send({ message: `Maintenance ce soir ${suffix}`, active: false })
      .expect(200);
    pub = await http().get('/api/v1/announcements').expect(200);
    expect(pub.body.data.some((a: { message: string }) => a.message.includes(suffix))).toBe(false);
    await as(modAdm)
      .post('/api/v1/admin/announcements')
      .send({ message: `Lien piégé ${suffix}`, linkUrl: 'javascript:alert(1)' })
      .expect(400);
    await as(modAdm).delete(`/api/v1/admin/announcements/${created.body.id}`).expect(204);
  });

  it('administrateurs : seul un super-admin invite, change un rôle ou retire l’accès', async () => {
    const email = `nouvel-admin-${suffix}@devhub.test`;
    await as(modAdm).post('/api/v1/admin/admins').send({ email, name: 'Nouvel Admin' }).expect(403);
    const inv = await as(superAdm)
      .post('/api/v1/admin/admins')
      .send({ email, name: 'Nouvel Admin' })
      .expect(201);
    expect(inv.body).toMatchObject({ email, password: expect.any(String) });

    // Le compte invité se connecte avec son mot de passe.
    await http()
      .post('/api/v1/admin/session')
      .set(ADMIN_HEADERS)
      .send({ email, password: inv.body.password })
      .expect(204);
    const list = await as(superAdm).get('/api/v1/admin/admins').expect(200);
    const invited = list.body.data.find((a: { email: string }) => a.email === email);
    expect(invited).toMatchObject({ role: 'moderator' });

    await as(superAdm).post('/api/v1/admin/admins').send({ email, name: 'Doublon' }).expect(409);
    await as(modAdm)
      .patch(`/api/v1/admin/admins/${invited.id}`)
      .send({ role: 'super' })
      .expect(403);
    await as(superAdm).patch(`/api/v1/admin/admins/${invited.id}`).send({ role: null }).expect(204);
    const supId = (await prisma.user.findUniqueOrThrow({ where: { handle: `sup-adm-${suffix}` } }))
      .id;
    await as(superAdm).patch(`/api/v1/admin/admins/${supId}`).send({ role: null }).expect(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: invited.id } })).isAdmin).toBe(
      false,
    );
  });

  it('suppression d’un compte par un super-admin : anonymisé', async () => {
    await as(superAdm)
      .post(`/api/v1/admin/users/${devId}/action`)
      .send({ action: 'delete' })
      .expect(204);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: devId } });
    expect(u.deletedAt).not.toBeNull();
    expect(u.handle).toMatch(/^deleted-/);
    void WRITE_HEADERS;
  });
});
