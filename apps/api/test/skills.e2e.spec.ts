import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ImportProfileJob } from '../src/modules/passport/jobs/import-profile.job';
import { applyTestEnv } from './env.fixture';
import { ensureTags } from './tags.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// PR1 + X3 de bout en bout, avec le faux fournisseur et le faux client GitHub.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const login = `e2e-skills-${randomBytes(4).toString('hex')}`;

// Étiquettes utilisées par le faux profil, identiques au seed (la base de CI n'est pas seedée).
const TAGS = [
  ['typescript', 'TypeScript', ['TypeScript', 'ts']],
  ['javascript', 'JavaScript', ['JavaScript', 'js']],
  ['python', 'Python', ['Python', 'py']],
  ['css', 'CSS', ['CSS', 'SCSS', 'Sass']],
  ['html', 'HTML', ['HTML']],
  ['docker', 'Docker', ['Dockerfile', 'docker-compose']],
] as const;

describe('compétences importées depuis GitHub (PR1, X3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(
      prisma,
      TAGS.map(([slug, label, aliases]) => ({ slug, label, aliases })),
    );
    cookie = await signInAs(app, login);
    userId = (await prisma.user.findUniqueOrThrow({ where: { handle: login } })).id;
  });

  afterAll(async () => {
    await prisma.githubCache.deleteMany({ where: { key: `profile-import:${userId}` } });
    await prisma.user.deleteMany({ where: { handle: { startsWith: login } } });
    await app.close();
  });

  it('envoie le job d’import à l’inscription', async () => {
    const jobs = await prisma.$queryRaw<Array<{ data: { userId: string } }>>`
      SELECT data FROM pgboss.job WHERE name = 'github.import-profile' AND data->>'userId' = ${userId}`;
    expect(jobs).toHaveLength(1);
  });

  it('n’a aucune compétence tant que l’import n’a pas tourné', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me/skills')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body).toEqual({ skills: [], lastImportedAt: null });
  });

  it('le handler du worker importe le profil : au moins 3 compétences proposées', async () => {
    await app.get(ImportProfileJob).handle(userId);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/skills')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.lastImportedAt).not.toBeNull();
    expect(res.body.skills.length).toBeGreaterThanOrEqual(3);
    const by = Object.fromEntries(
      res.body.skills.map((s: { tag: { slug: string } }) => [s.tag.slug, s]),
    );
    expect(by.typescript).toMatchObject({
      githubSignal: 5,
      githubRepos: 1,
      platformPoints: 0,
      score: 5,
      level: 'beginner',
    });
    expect(by.python).toMatchObject({ githubSignal: 5 });
    // Dockerfile à 10 % et JavaScript ancien : jamais de points GitHub.
    for (const slug of ['docker', 'javascript'])
      if (by[slug]) expect(by[slug].githubSignal).toBe(0);
  });

  it('conserve la part plateforme (XP) lors d’un réimport', async () => {
    const ts = await prisma.tag.findUniqueOrThrow({ where: { slug: 'typescript' } });
    await prisma.userSkill.update({
      where: { userId_tagId: { userId, tagId: ts.id } },
      data: { xpTag: 25 },
    });
    await prisma.githubCache.update({
      where: { key: `profile-import:${userId}` },
      data: { fetchedAt: new Date(Date.now() - 2 * 3600 * 1000) },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/github/refresh')
      .set('Cookie', cookie)
      .set(WRITE_HEADERS)
      .expect(200);
    const tsSkill = res.body.skills.find(
      (s: { tag: { slug: string } }) => s.tag.slug === 'typescript',
    );
    expect(tsSkill).toMatchObject({
      githubSignal: 5,
      platformPoints: 25,
      score: 30,
      level: 'confirmed',
    });
  });

  it('refuse un second réimport dans l’heure avec Retry-After', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/me/github/refresh')
      .set('Cookie', cookie)
      .set(WRITE_HEADERS)
      .expect(429);
    expect(res.body.code).toBe('rate_limited');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('exige une session', async () => {
    await request(app.getHttpServer()).get('/api/v1/me/skills').expect(401);
  });
});
