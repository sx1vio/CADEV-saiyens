import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// D4 de bout en bout. La base est partagée avec les autres fichiers : on compare l'état avant et
// après nos inscriptions, sur des pays rarement utilisés ailleurs (Comores, Maurice).
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const KM = 'KM';
const MU = 'MU';

type MapBody = {
  activeWindowDays: number;
  countries: Array<{
    country: string;
    devs: number;
    activeDevs: number;
    questionsUnblocked: number;
    totalXp: number;
  }>;
  unlocated: { devs: number };
  demo: { devs: number; totalXp: number };
};

describe('carte de l’Afrique (D4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const h = (n: string) => `${n}-map-${suffix}`;
  const cookie = new Map<string, string>();
  let before: MapBody;

  const map = async (): Promise<MapBody> => {
    const res = await request(app.getHttpServer()).get('/api/v1/leaderboard/map').expect(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    return res.body as MapBody;
  };
  const row = (m: MapBody, c: string) =>
    m.countries.find((r) => r.country === c) ?? {
      devs: 0,
      activeDevs: 0,
      questionsUnblocked: 0,
      totalXp: 0,
    };
  const write = (who: string, path: string, body: object = {}) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get(who)!)
      .set('Idempotency-Key', randomUUID())
      .send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    before = await map();

    const people: Array<[string, object]> = [
      ['helper', { country: KM }],
      ['asker', { country: KM }],
      ['shy', { country: MU, privacy: { hideCountry: true } }],
      ['ghost', { country: MU, privacy: { unlisted: true } }],
      ['demo', { country: MU, isDemo: true }],
    ];
    for (const [name, data] of people) {
      cookie.set(name, await signInAs(app, h(name)));
      await prisma.user.update({ where: { handle: h(name) }, data });
    }
    // Une vraie aide : la question de « asker » est débloquée par « helper ».
    const q = await write('asker', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Carte ${suffix} : le conteneur redémarre en boucle`,
      body: 'Le healthcheck échoue au démarrage.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    const a = await write('helper', `/api/v1/questions/${q.body.id}/answers`, {
      clientId: randomUUID(),
      body: 'Augmente start_period du healthcheck.',
    }).expect(201);
    await write('asker', `/api/v1/answers/${a.body.id}/accept`).expect(200);
    // Proof XP anciens (hors fenêtre d'activité) pour « asker », XP de démo pour « demo ».
    for (const [name, points, daysAgo] of [
      ['asker', 7, 90],
      ['demo', 40, 1],
    ] as const) {
      const u = await prisma.user.findUniqueOrThrow({ where: { handle: h(name) } });
      await prisma.xpEvent.create({
        data: {
          userId: u.id,
          kind: 'answer_accepted',
          points,
          sourceType: 'answer',
          sourceId: randomUUID(),
          createdAt: new Date(Date.now() - daysAgo * 86_400_000),
        },
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('agrège par pays : devs, actifs sur 30 jours, réponses validées, Proof XP', async () => {
    const after = await map();
    expect(after.activeWindowDays).toBe(30);
    const km = row(after, KM);
    const km0 = row(before, KM);
    expect(km.devs - km0.devs).toBe(2);
    // helper vient de gagner des XP ; asker n'a que des XP vieux de 90 jours (et +1 pour avoir validé).
    expect(km.activeDevs - km0.activeDevs).toBe(2);
    expect(km.questionsUnblocked - km0.questionsUnblocked).toBe(1);
    expect(km.totalXp - km0.totalXp).toBeGreaterThanOrEqual(7 + 10);
  });

  it('pays masqué compté à part, non listé exclu, démo jamais mêlée aux pays', async () => {
    const after = await map();
    // Ni « shy » (pays masqué), ni « ghost » (non listé), ni « demo » ne comptent pour Maurice.
    expect(row(after, MU).devs - row(before, MU).devs).toBe(0);
    // Totaux globaux : d'autres fichiers créent des comptes en parallèle, d'où « au moins ».
    expect(after.unlocated.devs - before.unlocated.devs).toBeGreaterThanOrEqual(1);
    expect(after.demo.devs - before.demo.devs).toBeGreaterThanOrEqual(1);
    expect(after.demo.totalXp - before.demo.totalXp).toBeGreaterThanOrEqual(40);
  });
});
