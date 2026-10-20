import { randomBytes, randomUUID } from 'node:crypto';
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

// S16 : file « Personne n'a encore répondu » des aidants. Questions de mes stacks sans réponse,
// la plus urgente puis celle qui attend depuis le plus longtemps, pagination stable.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const author = `e2e-s16-author-${suffix}`;
const helper = `e2e-s16-helper-${suffix}`;
const newcomer = `e2e-s16-new-${suffix}`;
// Étiquettes propres à cet essai : les autres fichiers de test ne les voient pas.
const mine = `s16-mine-${suffix}`;
const other = `s16-other-${suffix}`;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

describe('file « Personne n’a encore répondu » (S16)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let helperCookie: string;
  let newcomerCookie: string;
  const ids: Record<string, string> = {};

  const list = (cookie: string | null, query: Record<string, string | number | boolean>) => {
    const req = request(app.getHttpServer()).get('/api/v1/questions').query(query);
    return (cookie ? req.set('Cookie', cookie) : req).expect(200);
  };
  const idsOf = (res: request.Response) => res.body.data.map((q: { id: string }) => q.id);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    const tagIds = await ensureTags(prisma, [
      { slug: mine, label: `Mine ${suffix}` },
      { slug: other, label: `Other ${suffix}` },
    ]);
    await signInAs(app, author);
    helperCookie = await signInAs(app, helper);
    newcomerCookie = await signInAs(app, newcomer);
    const authorId = (await prisma.user.findUniqueOrThrow({ where: { handle: author } })).id;
    const helperUser = await prisma.user.update({
      where: { handle: helper },
      data: { canHelpTagIds: [tagIds.get(mine)!] },
    });

    const ask = async (
      key: string,
      tag: string,
      urgency: 'low' | 'normal' | 'high',
      createdAt: Date,
    ) => {
      const q = await prisma.question.create({
        data: {
          authorId,
          clientId: randomUUID(),
          title: `Question ${key} ${suffix}`,
          body: 'Détails.',
          lang: 'fr',
          urgency,
          createdAt,
          tags: { create: { tagId: tagIds.get(tag)! } },
        },
      });
      ids[key] = q.id;
    };
    await ask('normalOld', mine, 'normal', hoursAgo(2));
    await ask('normalRecent', mine, 'normal', hoursAgo(1));
    await ask('highRecent', mine, 'high', hoursAgo(0.5));
    await ask('lowOldest', mine, 'low', hoursAgo(5));
    await ask('answered', mine, 'high', hoursAgo(3));
    await ask('otherStack', other, 'high', hoursAgo(4));
    await prisma.answer.create({
      data: {
        questionId: ids.answered!,
        authorId: helperUser.id,
        clientId: randomUUID(),
        body: 'Une piste.',
      },
    });
  });

  afterAll(async () => {
    await prisma.question.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await prisma.tag.deleteMany({ where: { slug: { in: [mine, other] } } });
    await app.close();
  });

  const queue = { status: 'open', unanswered: true, forMe: true, sort: 'waiting' };

  it('mes stacks, sans réponse : la plus urgente, puis celle qui attend depuis le plus longtemps', async () => {
    const res = await list(helperCookie, { ...queue, limit: 50 });
    const mineOnly = idsOf(res).filter((id: string) => Object.values(ids).includes(id));
    expect(mineOnly).toEqual([ids.highRecent, ids.normalOld, ids.normalRecent, ids.lowOldest]);
  });

  it('pagine dans le même ordre, sans doublon ni oubli', async () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const res = await list(helperCookie, {
        ...queue,
        tag: mine,
        limit: 1,
        ...(cursor ? { cursor } : {}),
      });
      seen.push(...idsOf(res));
      cursor = res.body.page.nextCursor ?? undefined;
    } while (cursor && seen.length < 10);
    expect(seen).toEqual([ids.highRecent, ids.normalOld, ids.normalRecent, ids.lowOldest]);
  });

  it('sans étiquette ni session, aucun filtre de stack : la file reste visible', async () => {
    expect(idsOf(await list(newcomerCookie, { ...queue, tag: other }))).toEqual([ids.otherStack]);
    expect(idsOf(await list(null, { ...queue, tag: other }))).toEqual([ids.otherStack]);
    // L'aidant ne voit pas la question hors de ses stacks.
    expect(idsOf(await list(helperCookie, { ...queue, tag: other }))).toEqual([]);
  });

  it('sans `sort`, l’ordre reste du plus récent au plus ancien', async () => {
    const res = await list(helperCookie, { status: 'open', unanswered: true, tag: mine });
    expect(idsOf(res)).toEqual([ids.highRecent, ids.normalRecent, ids.normalOld, ids.lowOldest]);
  });
});
