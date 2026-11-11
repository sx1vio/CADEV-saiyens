import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { PrismaNewsRepository } from '../src/modules/news/infrastructure/prisma-news.repository';
import { ADMIN_HEADERS, adminSignIn, makeAdmin } from './admin.helper';
import { applyTestEnv } from './env.fixture';
import { signInAs } from './sign-in.helper';

// Contenus de la plateforme depuis l'administration (11/11/2026) : ajout par lien, modification
// protégée de la collecte, retrait et remise en ligne, suppression des seuls ajouts manuels.
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  ADMIN_URL: 'http://localhost:5299',
});

const suffix = randomBytes(4).toString('hex');
const url = `https://exemple.dev/kotlin-${suffix}`;

describe('administration des contenus (actualités, skills, vidéos…)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let dev: string;
  let id: string;
  const http = () => request(app.getHttpServer());
  const as = (cookie: string) => ({
    get: (p: string) => http().get(p).set(ADMIN_HEADERS).set('Cookie', cookie),
    post: (p: string) => http().post(p).set(ADMIN_HEADERS).set('Cookie', cookie),
    put: (p: string) => http().put(p).set(ADMIN_HEADERS).set('Cookie', cookie),
    delete: (p: string) => http().delete(p).set(ADMIN_HEADERS).set('Cookie', cookie),
  });
  const input = {
    url,
    kind: 'article',
    category: 'dev',
    lang: 'fr',
    title: `Kotlin Multiplatform en production ${suffix}`,
    summary: 'Retour d’expérience.',
    image: null,
    sourceName: 'Exemple',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    dev = await signInAs(app, `dev-news-${suffix}`);
    await signInAs(app, `adm-news-${suffix}`);
    admin = await adminSignIn(app, await makeAdmin(prisma, `adm-news-${suffix}`));
  });

  afterAll(async () => {
    await app.close();
  });

  it('reste invisible sans session d’administration', async () => {
    await http().get('/api/v1/admin/news').set('Cookie', dev).expect(404);
  });

  it('ajoute un contenu, visible sur le site et protégé de la collecte', async () => {
    const created = await as(admin).post('/api/v1/admin/news').send(input).expect(201);
    id = created.body.id;
    expect(created.body).toMatchObject({ curated: true, hidden: false, source: 'devhub' });

    const pub = await http().get(`/api/v1/news?q=${suffix}`).expect(200);
    expect(JSON.stringify(pub.body)).toContain(input.title);

    // La collecte repasse sur le même lien : le titre de l'administration reste.
    await app.get(PrismaNewsRepository).upsert([
      {
        kind: 'article',
        source: 'hn',
        sourceName: 'Hacker News',
        category: 'tech',
        lang: 'en',
        title: 'Titre écrasé par la collecte',
        summary: '',
        url,
        image: null,
        author: null,
        publishedAt: new Date(),
      },
    ]);
    const row = await prisma.newsItem.findUniqueOrThrow({ where: { id } });
    expect(row.title).toBe(input.title);
  });

  it('modifie, retire puis remet en ligne', async () => {
    const upd = await as(admin)
      .put(`/api/v1/admin/news/${id}`)
      .send({ ...input, kind: 'skill', title: `Skill ${suffix}` })
      .expect(200);
    expect(upd.body.kind).toBe('skill');

    await as(admin).post(`/api/v1/admin/news/${id}/hide`).expect(200);
    await http().get(`/api/v1/news/item/${id}`).expect(404);
    const hidden = await as(admin).get(`/api/v1/admin/news?state=hidden&q=${suffix}`).expect(200);
    expect(hidden.body.data.map((x: { id: string }) => x.id)).toContain(id);

    await as(admin).post(`/api/v1/admin/news/${id}/restore`).expect(200);
    await http().get(`/api/v1/news/item/${id}`).expect(200);

    const log = await prisma.adminAction.findMany({
      where: { targetType: 'news', reason: { startsWith: id } },
    });
    expect(log.map((l) => l.action)).toEqual(
      expect.arrayContaining(['news_create', 'news_update', 'news_hide', 'news_restore']),
    );
  });

  it('ne supprime que les ajouts manuels ; un contenu collecté se retire', async () => {
    const collected = await prisma.newsItem.create({
      data: {
        id: randomBytes(12).toString('hex'),
        kind: 'article',
        source: 'hn',
        sourceName: 'Hacker News',
        category: 'tech',
        lang: 'en',
        title: 'Collecté',
        url: `https://exemple.dev/collecte-${suffix}`,
        publishedAt: new Date(),
      },
    });
    const refused = await as(admin).delete(`/api/v1/admin/news/${collected.id}`).expect(400);
    expect(refused.body.code).toBe('news.collected');
    await as(admin).delete(`/api/v1/admin/news/${id}`).expect(204);
    await as(admin).delete(`/api/v1/admin/news/pas-un-id`).expect(404);
  });

  it('l’aperçu refuse les adresses internes et les liens invalides', async () => {
    await as(admin)
      .post('/api/v1/admin/news/preview')
      .send({ url: 'http://exemple.dev' })
      .expect(400);
    const internal = await as(admin)
      .post('/api/v1/admin/news/preview')
      .send({ url: 'https://127.0.0.1/admin' })
      .expect(422);
    expect(internal.body.code).toBe('news.preview_failed');
  });
});
