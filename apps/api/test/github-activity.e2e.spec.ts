import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { GITHUB_FETCH } from '../src/modules/passport/infrastructure/github-activity.reader';
import { applyTestEnv } from './env.fixture';
import { signInAs } from './sign-in.helper';

// Activité GitHub du Passport, avec un faux GitHub : aucun appel réseau pendant les tests.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const s = randomBytes(4).toString('hex');
const handle = `gh-act-${s}`;
const calls: string[] = [];
let githubDown = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fakeGithub = async (url: string) => {
  calls.push(url);
  if (githubDown) return json({ message: 'down' }, 503);
  const path = new URL(url).pathname;
  if (path.startsWith('/user/'))
    return json({
      login: 'ama-dev',
      html_url: 'https://github.com/ama-dev',
      followers: 12,
      following: 3,
      public_repos: 2,
      created_at: '2021-03-01T00:00:00Z',
    });
  if (path.endsWith('/repos'))
    return json([
      {
        name: 'momo-pay',
        full_name: 'ama-dev/momo-pay',
        description: 'Paiement mobile money',
        language: 'TypeScript',
        stargazers_count: 8,
        forks_count: 2,
        pushed_at: new Date().toISOString(),
        html_url: 'https://github.com/ama-dev/momo-pay',
        homepage: null,
        topics: ['fintech'],
        fork: false,
      },
    ]);
  if (path.endsWith('/events/public'))
    return json([
      {
        type: 'PushEvent',
        created_at: new Date().toISOString(),
        repo: { name: 'ama-dev/momo-pay' },
        payload: { size: 3, ref: 'refs/heads/main' },
      },
    ]);
  if (path.endsWith('/commits'))
    return json([
      {
        sha: 'a1b2c3d4e5',
        html_url: 'https://github.com/ama-dev/momo-pay/commit/a1b2c3d',
        commit: {
          message: 'feat: paiement hors ligne',
          author: { date: new Date().toISOString() },
        },
      },
    ]);
  return json({}, 404);
};

describe('activité GitHub sur le Passport', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GITHUB_FETCH)
      .useValue(fakeGithub)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await signInAs(app, handle);
    await signInAs(app, `sans-gh-${s}`);
    await prisma.user.update({ where: { handle: `sans-gh-${s}` }, data: { githubId: null } });
  });

  afterAll(async () => {
    const u = await prisma.user.findUnique({ where: { handle } });
    if (u?.githubId)
      await prisma.githubCache.deleteMany({ where: { key: `gh-activity:${u.githubId}` } });
    await app.close();
  });

  it('renvoie dépôts, commits, activité et calendrier, puis sert le cache', async () => {
    const res = await http().get(`/api/v1/users/${handle}/github`).expect(200);
    expect(res.body.profile).toMatchObject({ login: 'ama-dev', followers: 12 });
    expect(res.body.totals).toMatchObject({ stars: 8, commits90d: 3, events90d: 1 });
    expect(res.body.repos[0]).toMatchObject({ name: 'momo-pay', topics: ['fintech'] });
    expect(res.body.commits[0]).toMatchObject({
      sha: 'a1b2c3d',
      message: 'feat: paiement hors ligne',
    });
    expect(res.body.events[0].label).toBe('3 commits poussés sur main');
    expect(res.body.calendar).toHaveLength(91);
    // Données publiques seulement : jamais de jeton envoyé en mode de test.
    const before = calls.length;
    await http().get(`/api/v1/users/${handle}/github`).expect(200);
    expect(calls.length).toBe(before);
  });

  it('GitHub en panne : la dernière version reste servie', async () => {
    const u = await prisma.user.findUniqueOrThrow({ where: { handle } });
    await prisma.githubCache.update({
      where: { key: `gh-activity:${u.githubId}` },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    githubDown = true;
    await http().get(`/api/v1/users/${handle}/github`).expect(200);
    await prisma.githubCache.delete({ where: { key: `gh-activity:${u.githubId}` } });
    await http().get(`/api/v1/users/${handle}/github`).expect(503);
    githubDown = false;
  });

  it('rien sans GitHub relié, ni quand le membre masque ses statistiques', async () => {
    await http().get(`/api/v1/users/sans-gh-${s}/github`).expect(404);
    await http().get(`/api/v1/users/personne-${s}/github`).expect(404);
    await prisma.user.update({ where: { handle }, data: { privacy: { hideStats: true } } });
    await http().get(`/api/v1/users/${handle}/github`).expect(404);
    await prisma.user.update({ where: { handle }, data: { privacy: {} } });
  });
});
