import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// D1, D2 de bout en bout. Une étiquette et des pays propres à ce fichier isolent les résultats.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const slug = `disc-${suffix}`;
// Codes pays rarement utilisés ailleurs dans les tests.
const ZZ = 'ZW';
const YY = 'ZM';

describe('découverte et classement (D1, D2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const h = (n: string) => `${n}-disc-${suffix}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    const tagId = (await ensureTags(prisma, [{ slug, label: 'Flutter' }])).get(slug)!;
    const people: Array<[string, object]> = [
      [
        'awa',
        {
          country: ZZ,
          timezone: 'Africa/Harare',
          availability: { now: true },
          lookingFor: 'Mission mobile',
        },
      ],
      ['moussa', { country: ZZ, timezone: 'Africa/Harare', privacy: {} }],
      ['ghost', { country: ZZ, timezone: 'Africa/Harare', privacy: { unlisted: true } }],
      ['shy', { country: YY, timezone: 'Africa/Lusaka', privacy: { country: false } }],
      ['far', { country: YY, timezone: 'Pacific/Auckland' }],
    ];
    for (const [name, data] of people) {
      await signInAs(app, h(name));
      const u = await prisma.user.update({ where: { handle: h(name) }, data });
      await prisma.userSkill.create({ data: { userId: u.id, tagId, githubSignal: 20, score: 20 } });
    }
    // Proof XP : awa 30, moussa 10 (événements directs du journal, append-only).
    for (const [name, points] of [
      ['awa', 30],
      ['moussa', 10],
      ['ghost', 50],
    ] as const) {
      const u = await prisma.user.findUniqueOrThrow({ where: { handle: h(name) } });
      await prisma.xpEvent.create({
        data: {
          userId: u.id,
          kind: 'answer_accepted',
          points,
          sourceType: 'answer',
          sourceId: crypto.randomUUID(),
        },
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const devs = (query: Record<string, string>) =>
    request(app.getHttpServer())
      .get('/api/v1/discover/devs')
      .query({ tag: slug, limit: '50', ...query })
      .expect(200);
  const handles = (res: request.Response) =>
    res.body.data.map((d: { handle: string }) => d.handle).sort();

  it('par stack : les profils sans réglage apparaissent, les non listés jamais', async () => {
    const res = await devs({});
    expect(handles(res)).toEqual([h('awa'), h('far'), h('moussa'), h('shy')].sort());
    const awa = res.body.data.find((d: { handle: string }) => d.handle === h('awa'));
    expect(awa).toMatchObject({
      country: ZZ,
      availableNow: true,
      totalXp: 30,
      topSkills: [{ slug, score: 20 }],
    });
    const shy = res.body.data.find((d: { handle: string }) => d.handle === h('shy'));
    expect(shy).toMatchObject({ country: null, timezone: null });
  });

  it('filtres combinables : pays, fuseau (± 3 h), disponibilité, objectif', async () => {
    expect(handles(await devs({ country: ZZ }))).toEqual([h('awa'), h('moussa')].sort());
    // Le pays masqué de « shy » ne permet pas de le retrouver par pays.
    expect(handles(await devs({ country: YY }))).toEqual([h('far')]);
    expect(handles(await devs({ tz: '2' }))).toEqual([h('awa'), h('moussa')].sort());
    expect(handles(await devs({ available: 'true' }))).toEqual([h('awa')]);
    expect(handles(await devs({ lookingFor: 'mobile' }))).toEqual([h('awa')]);
  });

  it('pagination par curseur sans doublon', async () => {
    const first = await devs({ limit: '2' });
    expect(first.body.page.hasMore).toBe(true);
    const second = await devs({ limit: '2', cursor: first.body.page.nextCursor });
    expect(new Set([...handles(first), ...handles(second)]).size).toBe(4);
  });

  it('classement par pays et devs d’un pays : non listés et pays masqués exclus', async () => {
    const countries = await request(app.getHttpServer())
      .get('/api/v1/leaderboard')
      .query({ limit: '100' })
      .expect(200);
    expect(countries.body.method).toContain('journal');
    const zz = countries.body.countries.find((c: { country: string }) => c.country === ZZ);
    // Les codes pays sont partagés entre exécutions : l'attendu est recalculé sur les comptes
    // listés et non démo du pays. Le compte non listé (50 XP) ne doit jamais y figurer.
    const listed = await prisma.user.findMany({
      where: { country: ZZ, isDemo: false, deletedAt: null },
      select: { id: true, privacy: true },
    });
    const ids = listed
      .filter((u) => (u.privacy as { unlisted?: boolean } | null)?.unlisted !== true)
      .map((u) => u.id);
    const expected = await prisma.xpEvent.aggregate({
      where: { userId: { in: ids } },
      _sum: { points: true },
    });
    expect(zz).toMatchObject({ totalXp: expected._sum.points ?? 0, devs: ids.length });

    const zzDevs = await request(app.getHttpServer())
      .get('/api/v1/leaderboard')
      .query({ scope: 'devs', country: ZZ, limit: '100' })
      .expect(200);
    const ranked = zzDevs.body.devs.map((d: { handle: string }) => d.handle);
    expect(ranked).toEqual(expect.arrayContaining([h('awa'), h('moussa')]));
    expect(ranked).not.toContain(h('ghost'));
    expect(ranked.indexOf(h('awa'))).toBeLessThan(ranked.indexOf(h('moussa')));
    expect(zzDevs.body.devs.find((d: { handle: string }) => d.handle === h('awa'))).toMatchObject({
      totalXp: 30,
      country: ZZ,
    });
  });
});
