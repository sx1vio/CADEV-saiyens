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
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// Fil de la communauté : publications, commentaires en fil, votes, signalement et modération.
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  ADMIN_URL: 'http://localhost:5299',
});

const suffix = randomBytes(4).toString('hex');

describe('fil de la communauté', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie = new Map<string, string>();
  const handle = (n: string) => `${n}-post-${suffix}`;
  let postId: string;
  let commentId: string;

  const send = (method: 'post' | 'put' | 'delete', who: string, path: string, body: object = {}) =>
    request(app.getHttpServer())
      [method](path)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', cookie.get(who)!)
      .send(body);
  const get = (path: string, who?: string) => {
    const r = request(app.getHttpServer()).get(path);
    return who ? r.set('Cookie', cookie.get(who)!) : r;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    for (const n of ['awa', 'kofi', 'admin']) cookie.set(n, await signInAs(app, handle(n)));
    // Comptes plus anciens qu'une heure : ils peuvent publier des liens.
    await prisma.user.updateMany({
      where: { handle: { in: [handle('awa'), handle('kofi')] } },
      data: { createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    });
    cookie.set('adm', await adminSignIn(app, await makeAdmin(prisma, handle('admin'))));
  });

  afterAll(async () => {
    await prisma.post.deleteMany({ where: { title: { contains: suffix } } });
    await app.close();
  });

  it('publier demande un compte ; la publication est publique, avec un vote de son auteur', async () => {
    const body = {
      community: 'web',
      kind: 'question',
      title: `Comment servir une PWA hors ligne ${suffix}`,
      body: 'Mon service worker met en cache les POST, est-ce grave ?',
      tags: ['PWA', 'pwa', 'service-worker'],
    };
    await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(WRITE_HEADERS)
      .send(body)
      .expect(401);
    const created = await send('post', 'awa', '/api/v1/posts', body).expect(201);
    postId = created.body.id;

    const list = await get('/api/v1/posts?community=web').expect(200);
    const mine = list.body.data.find((p: { id: string }) => p.id === postId);
    expect(mine).toMatchObject({
      community: 'web',
      kind: 'question',
      score: 1,
      comments: 0,
      tags: ['pwa', 'service-worker'],
      author: { handle: handle('awa') },
      mine: false,
    });
    const asAwa = await get(`/api/v1/posts/${postId}`, 'awa').expect(200);
    expect(asAwa.body).toMatchObject({ mine: true, myVote: 1, commentList: [] });
  });

  it('valide le contenu : titre trop court, communauté inconnue, lien non https', async () => {
    await send('post', 'awa', '/api/v1/posts', {
      community: 'web',
      kind: 'discussion',
      title: 'Court',
    }).expect(400);
    await send('post', 'awa', '/api/v1/posts', {
      community: 'jeux',
      kind: 'discussion',
      title: `Titre assez long ${suffix}`,
    }).expect(400);
    await send('post', 'awa', '/api/v1/posts', {
      community: 'web',
      kind: 'discussion',
      title: `Titre assez long ${suffix}`,
      linkUrl: 'http://exemple.com',
    }).expect(400);
  });

  it('commentaires en fil et votes', async () => {
    const c = await send('post', 'kofi', `/api/v1/posts/${postId}/comments`, {
      body: 'Oui : ne mets jamais en cache une requête POST.',
    }).expect(201);
    commentId = c.body.id;
    await send('post', 'awa', `/api/v1/posts/${postId}/comments`, {
      body: 'Merci, je corrige.',
      parentId: commentId,
    }).expect(201);
    await send('post', 'awa', `/api/v1/posts/${postId}/comments`, {
      body: 'Parent inconnu',
      parentId: randomUUID(),
    }).expect(422);

    expect(
      (await send('put', 'kofi', `/api/v1/posts/${postId}/vote`, { value: 1 }).expect(200)).body,
    ).toEqual({ score: 2, myVote: 1 });
    expect(
      (await send('put', 'kofi', `/api/v1/posts/${postId}/vote`, { value: -1 }).expect(200)).body,
    ).toEqual({ score: 0, myVote: -1 });
    expect(
      (await send('put', 'kofi', `/api/v1/posts/${postId}/vote`, { value: 0 }).expect(200)).body,
    ).toEqual({ score: 1, myVote: 0 });

    const detail = await get(`/api/v1/posts/${postId}`).expect(200);
    expect(detail.body.comments).toBe(2);
    expect(detail.body.commentList.map((x: { parentId: string | null }) => x.parentId)).toEqual([
      null,
      commentId,
    ]);
  });

  it('un compte de moins d’une heure ne publie pas encore de lien', async () => {
    cookie.set('neuf', await signInAs(app, handle('neuf')));
    const r = await send('post', 'neuf', '/api/v1/posts', {
      community: 'showcase',
      kind: 'showcase',
      title: `Mon site de démonstration ${suffix}`,
      linkUrl: 'https://exemple.com',
    }).expect(422);
    expect(r.body.code).toBe('post.links_too_early');
  });

  it('signalé puis masqué par l’administration, il disparaît du fil', async () => {
    const rep = await send('post', 'kofi', '/api/v1/reports', {
      targetType: 'post',
      targetId: postId,
      reason: 'Test de modération',
    }).expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/reports/${rep.body.id}/action`)
      .set(ADMIN_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .set('Cookie', cookie.get('adm')!)
      .send({ action: 'hide', reason: 'Contenu masqué pour le test' })
      .expect(200);
    await get(`/api/v1/posts/${postId}`).expect(404);
    const list = await get('/api/v1/posts?community=web').expect(200);
    expect(list.body.data.map((p: { id: string }) => p.id)).not.toContain(postId);
  });

  it('l’auteur supprime sa publication ; personne d’autre ne le peut', async () => {
    const p = await send('post', 'awa', '/api/v1/posts', {
      community: 'carriere',
      kind: 'discussion',
      title: `Premier emploi de dev à Cotonou ${suffix}`,
    }).expect(201);
    await send('delete', 'kofi', `/api/v1/posts/${p.body.id}`).expect(404);
    await send('delete', 'awa', `/api/v1/posts/${p.body.id}`).expect(204);
    await get(`/api/v1/posts/${p.body.id}`).expect(404);
  });

  it('activité réelle des communautés', async () => {
    const res = await get('/api/v1/communities').expect(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.data[0]).toMatchObject({ slug: 'ia', posts: expect.any(Number) });
  });
});
