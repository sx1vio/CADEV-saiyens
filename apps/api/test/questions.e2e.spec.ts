import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TAG_REFERENCE } from '@devhub/core';
import { AppModule } from '../src/app.module';
import { TagReferenceSync } from '../src/modules/sos/infrastructure/tag-reference.sync';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { ensureTags } from './tags.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// S1 de bout en bout : idempotence (04-hors-ligne-sync § 3), lecture publique, recherche.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const login = `e2e-sos-${suffix}`;

describe('poser une question (S1) et la lire', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;

  const question = (over: Record<string, unknown> = {}) => ({
    clientId: randomUUID(),
    title: `nginx ${suffix} renvoie 502 derrière Docker`,
    body: 'Mon API répond en local mais pas derrière nginx. Chaîne : postgres://app:MotDePasse42@db/app',
    codeSnippet: 'proxy_pass http://localhost:3000;',
    tagSlugs: ['docker', 'nginx'],
    urgency: 'high',
    lang: 'fr',
    ...over,
  });
  const post = (body: object, key = randomUUID()) =>
    request(app.getHttpServer())
      .post('/api/v1/questions')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [
      { slug: 'docker', label: 'Docker' },
      { slug: 'nginx', label: 'nginx' },
    ]);
    cookie = await signInAs(app, login);
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { handle: login } });
    if (user) {
      await prisma.idempotencyKey.deleteMany({ where: { userId: user.id } });
      await prisma.question.deleteMany({ where: { authorId: user.id } });
    }
    await app.close();
  });

  it('le référentiel des étiquettes est en base dès le démarrage, sans seed (BUG-026)', async () => {
    const slugs = new Set(
      (await app.get(PrismaService).tag.findMany({ select: { slug: true } })).map((t) => t.slug),
    );
    for (const t of TAG_REFERENCE) expect(slugs, t.slug).toContain(t.slug);
    // Relancer l'alignement ne change rien (idempotent).
    expect(await app.get(TagReferenceSync).sync()).toBe(0);
  });

  it('GET /tags : référentiel public, mis en cache', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/tags').expect(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'docker', aliases: expect.any(Array) }),
      ]),
    );
  });

  it('exige une session et une clé d’idempotence', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID())
      .send(question())
      .expect(401);
    const res = await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .send(question())
      .expect(400);
    expect(res.body.code).toBe('idempotency_key.missing');
  });

  it('publie la question : 201, piste IA en attente, secrets masqués', async () => {
    const res = await post(question()).expect(201);
    expect(res.headers.location).toBe(`/api/v1/questions/${res.body.id}`);
    expect(res.body).toMatchObject({
      status: 'open',
      aiStatus: 'pending',
      version: 1,
      secretsMasked: 1,
      author: { handle: login, isDemo: false },
    });
    const stored = await prisma.question.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.body).not.toContain('MotDePasse42');
  });

  it('rejouer la même clé renvoie la même réponse, sans doublon', async () => {
    const key = randomUUID();
    const body = question();
    const first = await post(body, key).expect(201);
    const replay = await post(body, key).expect(201);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body).toEqual(first.body);
    expect(await prisma.question.count({ where: { clientId: body.clientId } })).toBe(1);
  });

  it('deux envois simultanés avec la même clé : une seule question', async () => {
    const key = randomUUID();
    const body = question();
    const [a, b] = await Promise.all([post(body, key), post(body, key)]);
    // Le second attend la fin du premier puis rejoue sa réponse (ou 409 s'il arrive pendant).
    expect([a.status, b.status].sort()).toEqual(expect.arrayContaining([201]));
    for (const r of [a, b]) expect([201, 409]).toContain(r.status);
    expect(await prisma.question.count({ where: { clientId: body.clientId } })).toBe(1);
  });

  it('même clé, autre requête : 422 idempotency_key.reused', async () => {
    const key = randomUUID();
    await post(question(), key).expect(201);
    const res = await post(question(), key).expect(422);
    expect(res.body.code).toBe('idempotency_key.reused');
  });

  it('même clientId avec une autre clé : 200 et la question existante', async () => {
    const body = question();
    const first = await post(body).expect(201);
    const second = await post(body).expect(200);
    expect(second.body.id).toBe(first.body.id);
  });

  it('étiquette inconnue : 422 question.tags_unknown', async () => {
    const res = await post(question({ tagSlugs: ['docker', 'cobol-74'] })).expect(422);
    expect(res.body.code).toBe('question.tags_unknown');
  });

  it('validation : titre trop court', async () => {
    const res = await post(question({ title: 'court' })).expect(400);
    expect(res.body.code).toBe('validation.failed');
  });

  it('liste publique, filtres et recherche plein texte', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/questions')
      .query({ tag: 'nginx', limit: 2 })
      .expect(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.page.hasMore).toBe(true);

    const next = await request(app.getHttpServer())
      .get('/api/v1/questions')
      .query({ tag: 'nginx', limit: 2, cursor: list.body.page.nextCursor })
      .expect(200);
    const ids = new Set([...list.body.data, ...next.body.data].map((q: { id: string }) => q.id));
    expect(ids.size).toBe(list.body.data.length + next.body.data.length);

    const found = await request(app.getHttpServer())
      .get('/api/v1/questions')
      .query({ q: `${suffix}` })
      .expect(200);
    expect(found.body.data.length).toBeGreaterThan(0);
    expect(found.body.data[0]).toMatchObject({ tags: expect.any(Array), answerCount: 0 });

    const mine = await request(app.getHttpServer())
      .get('/api/v1/questions')
      .query({ mine: 'true', limit: 50 })
      .set('Cookie', cookie)
      .expect(200);
    expect(
      mine.body.data.every((q: { author: { handle: string } }) => q.author.handle === login),
    ).toBe(true);
  });

  it('fiche publique : question, piste IA masquée tant qu’elle n’est pas prête', async () => {
    const created = await post(question()).expect(201);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/questions/${created.body.id}`)
      .expect(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      aiStatus: 'pending',
      aiHint: null,
      answers: [],
      helpers: [],
    });
    // Libellés et ordre des étiquettes dépendent des autres tests (base partagée) : on compare les slugs.
    expect(res.body.tags.map((t: { slug: string }) => t.slug).sort()).toEqual(['docker', 'nginx']);
    await request(app.getHttpServer()).get(`/api/v1/questions/${randomUUID()}`).expect(404);
  });

  it('envois simultanés avec des clés différentes : la limite horaire tient', async () => {
    const other = await signInAs(app, `${login}-burst`);
    const send = () =>
      request(app.getHttpServer())
        .post('/api/v1/questions')
        .set(WRITE_HEADERS)
        .set('Cookie', other)
        .set('Idempotency-Key', randomUUID())
        .send(question());
    const results = await Promise.all(Array.from({ length: 14 }, send));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(10);
    expect(statuses.filter((s) => s === 429)).toHaveLength(4);

    const user = await prisma.user.findUniqueOrThrow({ where: { handle: `${login}-burst` } });
    expect(await prisma.question.count({ where: { authorId: user.id } })).toBe(10);
    await prisma.idempotencyKey.deleteMany({ where: { userId: user.id } });
    await prisma.question.deleteMany({ where: { authorId: user.id } });
  });

  it('11e question dans l’heure : 429 avec Retry-After', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { handle: login } });
    const already = await prisma.question.count({ where: { authorId: user.id } });
    for (let i = already; i < 10; i++) await post(question()).expect(201);
    const res = await post(question()).expect(429);
    expect(res.body.code).toBe('rate_limited');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});
