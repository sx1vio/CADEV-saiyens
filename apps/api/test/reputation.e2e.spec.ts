import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { AwardXp, SelfVoteError, XpEventNotRevertableError } from '../src/modules/reputation';
import { applyTestEnv } from './env.fixture';

// X1 et X2 contre une vraie base : barème, plafonds, garde-fous, annulation, journal public.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const run = randomBytes(3).toString('hex');
const OLD = new Date('2025-01-01T00:00:00Z');

describe('reputation : Proof XP (X1, X2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let xp: AwardXp;
  const users: Record<string, string> = {};
  const tags: Record<string, string> = {};

  async function user(name: string, createdAt = OLD): Promise<string> {
    const u = await prisma.user.create({
      data: { handle: `e2e-rep-${run}-${name}`, displayName: name, createdAt },
    });
    users[name] = u.id;
    return u.id;
  }
  const points = async (userId: string) =>
    (await prisma.xpEvent.aggregate({ where: { userId }, _sum: { points: true } }))._sum.points ??
    0;
  const xpTag = async (userId: string, tag: string) =>
    (await prisma.userSkill.findUnique({ where: { userId_tagId: { userId, tagId: tags[tag]! } } }))
      ?.xpTag ?? 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    xp = app.get(AwardXp);
    for (const slug of ['docker', 'nginx', 'nodejs']) {
      tags[slug] = (
        await prisma.tag.upsert({ where: { slug }, create: { slug, label: slug }, update: {} })
      ).id;
    }
    for (const name of ['awa', 'moussa', 'kwame', 'aida']) await user(name);
  });

  afterAll(async () => {
    // Le journal est append-only (déclencheur) : le nettoyage des tests désactive les déclencheurs
    // pour cette seule transaction (rôle superutilisateur de la base de test).
    const ids = Object.values(users);
    await prisma.$transaction([
      prisma.$executeRawUnsafe(`SET LOCAL session_replication_role = replica`),
      prisma.xpEvent.deleteMany({ where: { userId: { in: ids } } }),
      prisma.user.deleteMany({ where: { id: { in: ids } } }),
    ]);
    await app.close();
  });

  it('validation rapide : 10 points répartis (4, 3, 3), bonus de 3 hors plafond, +1 à l’auteur', async () => {
    const result = await xp.acceptedAnswer({
      answerId: randomUUID(),
      questionId: randomUUID(),
      helperId: users.moussa!,
      authorId: users.awa!,
      tagIds: [tags.docker!, tags.nginx!, tags.nodejs!],
      minutesToAccept: 6,
    });
    expect(result.withheld).toEqual([]);
    expect(await points(users.moussa!)).toBe(13);
    expect(await points(users.awa!)).toBe(1);
    expect(await xpTag(users.moussa!, 'docker')).toBe(5); // 4 + 1 de bonus
    expect(await xpTag(users.moussa!, 'nginx')).toBe(4);
    const skill = await prisma.userSkill.findUniqueOrThrow({
      where: { userId_tagId: { userId: users.moussa!, tagId: tags.docker! } },
    });
    expect(skill.score).toBe(5); // G = 0, P = 5
  });

  it('est idempotent : une même validation ne rapporte qu’une fois', async () => {
    const input = {
      answerId: randomUUID(),
      questionId: randomUUID(),
      helperId: users.kwame!,
      authorId: users.aida!,
      tagIds: [tags.docker!],
      minutesToAccept: 60,
    };
    await xp.acceptedAnswer(input);
    const again = await xp.acceptedAnswer(input);
    expect(again.events).toEqual([]);
    expect(again.withheld).toContainEqual({
      userId: users.kwame!,
      kind: 'answer_accepted',
      reason: 'already_awarded',
    });
    expect(await points(users.kwame!)).toBe(10);
  });

  it('limite à 2 validations rémunérées par paire et par semaine, la question restant résolue', async () => {
    const helper = await user('pair-helper');
    const author = await user('pair-author');
    const validate = () =>
      xp.acceptedAnswer({
        answerId: randomUUID(),
        questionId: randomUUID(),
        helperId: helper,
        authorId: author,
        tagIds: [tags.docker!],
        minutesToAccept: 60,
      });
    await validate();
    await validate();
    const third = await validate();
    expect(third.withheld).toContainEqual({
      userId: helper,
      kind: 'answer_accepted',
      reason: 'pair_weekly_limit',
    });
    expect(await points(helper)).toBe(20);
    expect(await points(author)).toBe(3);
  });

  it('applique le plafond de 60 XP par jour, attribution partielle comprise, hors bonus de vitesse', async () => {
    const helper = await user('cap-helper');
    const owner = await user('cap-owner');
    for (let i = 0; i < 3; i++) {
      await xp.taskCompleted({
        taskId: randomUUID(),
        contributorId: helper,
        ownerId: owner,
        tagIds: [tags.nodejs!],
      });
    }
    await xp.acceptedAnswer({
      answerId: randomUUID(),
      questionId: randomUUID(),
      helperId: helper,
      authorId: owner,
      tagIds: [tags.nodejs!],
      minutesToAccept: 60,
    });
    expect(await points(helper)).toBe(55);

    const partial = await xp.taskCompleted({
      taskId: randomUUID(),
      contributorId: helper,
      ownerId: owner,
      tagIds: [tags.nodejs!],
    });
    expect(partial.events.map((e) => e.points)).toEqual([5]);
    expect(partial.withheld).toContainEqual({
      userId: helper,
      kind: 'task_completed',
      reason: 'daily_cap',
    });
    expect(await points(helper)).toBe(60);

    const fast = await xp.acceptedAnswer({
      answerId: randomUUID(),
      questionId: randomUUID(),
      helperId: helper,
      authorId: users.aida!,
      tagIds: [tags.nodejs!],
      minutesToAccept: 3,
    });
    expect(fast.events.filter((e) => e.userId === helper).map((e) => [e.kind, e.points])).toEqual([
      ['answer_fast_bonus', 3],
    ]);
    expect(fast.withheld).toContainEqual({
      userId: helper,
      kind: 'answer_accepted',
      reason: 'daily_cap',
    });
    expect(await points(helper)).toBe(63);
  });

  it('refuse le vote pour soi', async () => {
    await expect(
      xp.helpfulVote({
        answerId: randomUUID(),
        helperId: users.awa!,
        voterId: users.awa!,
        voterCreatedAt: OLD,
        tagIds: [],
      }),
    ).rejects.toBeInstanceOf(SelfVoteError);
  });

  it('ne rémunère pas le vote d’un compte de moins de 24 h', async () => {
    const helper = await user('vote-new-helper');
    const result = await xp.helpfulVote({
      answerId: randomUUID(),
      helperId: helper,
      voterId: users.awa!,
      voterCreatedAt: new Date(),
      tagIds: [tags.docker!],
    });
    expect(result.withheld).toEqual([
      { userId: helper, kind: 'answer_helpful_vote', reason: 'voter_too_new' },
    ]);
    expect(await points(helper)).toBe(0);
  });

  it('rémunère au plus 5 votes par réponse, une fois par votant', async () => {
    const helper = await user('vote-helper');
    const answerId = randomUUID();
    const voters = await Promise.all(Array.from({ length: 6 }, (_, i) => user(`voter-${i}`)));
    const vote = (voterId: string) =>
      xp.helpfulVote({
        answerId,
        helperId: helper,
        voterId,
        voterCreatedAt: OLD,
        tagIds: [tags.docker!],
      });
    for (const v of voters.slice(0, 5)) await vote(v);
    expect((await vote(voters[0]!)).withheld).toContainEqual({
      userId: helper,
      kind: 'answer_helpful_vote',
      reason: 'already_awarded',
    });
    expect((await vote(voters[5]!)).withheld).toContainEqual({
      userId: helper,
      kind: 'answer_helpful_vote',
      reason: 'vote_cap',
    });
    expect(await points(helper)).toBe(10);
  });

  it('annule un gain par un événement négatif, sans suppression, et une seule fois', async () => {
    const helper = await user('revert-helper');
    const award = await xp.codeReviewGiven({
      feedbackRequestId: randomUUID(),
      reviewerId: helper,
      requesterId: users.awa!,
      tagIds: [tags.nginx!],
    });
    const original = award.events[0]!;
    const revert = await xp.revert(original.id, 'collusion confirmée');
    expect(revert).toMatchObject({
      kind: 'revert',
      points: -8,
      revertsId: original.id,
      userId: helper,
    });
    expect(await points(helper)).toBe(0);
    expect(await xpTag(helper, 'nginx')).toBe(0);
    expect(
      (await prisma.xpEvent.findUniqueOrThrow({ where: { id: original.id } })).revertedAt,
    ).not.toBeNull();
    await expect(xp.revert(original.id, 'encore')).rejects.toBeInstanceOf(
      XpEventNotRevertableError,
    );
  });

  it('est atomique avec la transaction de l’appelant', async () => {
    const helper = await user('tx-helper');
    await expect(
      prisma.$transaction(async (tx) => {
        await xp.projectDemoShared(
          { roomId: randomUUID(), ownerId: helper, tagIds: [tags.docker!] },
          tx,
        );
        throw new Error('échec de l’action métier');
      }),
    ).rejects.toThrow('échec');
    expect(await points(helper)).toBe(0);
  });

  it('GET /u/:handle/proofs expose le journal public, paginé, sans la contrepartie', async () => {
    const handle = `e2e-rep-${run}-moussa`;
    const first = await request(app.getHttpServer())
      .get(`/api/v1/u/${handle}/proofs`)
      .query({ limit: 4 })
      .expect(200);
    expect(first.body.totalXp).toBe(13);
    expect(first.body.events).toHaveLength(4);
    expect(first.body.page.hasMore).toBe(true);
    expect(first.body.events[0]).not.toHaveProperty('counterpartId');
    expect(first.body.events[0].source.type).toBe('answer');

    const second = await request(app.getHttpServer())
      .get(`/api/v1/u/${handle}/proofs`)
      .query({ limit: 4, cursor: first.body.page.nextCursor })
      .expect(200);
    expect(second.body.events.length + first.body.events.length).toBe(6);
    expect(second.body.page).toEqual({ hasMore: false, nextCursor: null });
    const ids = [...first.body.events, ...second.body.events].map((e: { id: string }) => e.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('GET /u/:handle/proofs renvoie 404 pour un Passport inconnu', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/u/personne-inconnue/proofs')
      .expect(404);
    expect(res.body.code).toBe('not_found');
  });

  it('GET /rules/xp publie le barème appliqué', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/rules/xp').expect(200);
    expect(res.body.points).toMatchObject({
      answer_accepted: 10,
      answer_fast_bonus: 3,
      task_completed: 15,
    });
    expect(res.body.limits.dailyCap).toBe(60);
    expect(res.body.scoring.githubCap).toBe(40);
    expect(res.headers['cache-control']).toContain('max-age=3600');
  });
});
