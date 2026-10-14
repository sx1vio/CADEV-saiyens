import { Injectable } from '@nestjs/common';
import {
  type AvailabilitySettings,
  MATCHING,
  type MatchCandidate,
  availabilityAt,
  timezoneOffsetMinutes,
} from '@devhub/core';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { ClaimStore } from '../application/run-wave';
import type { MatchingQuestion, MatchingStore, NewMatchEvent } from '../domain/ports';

const MAX_CANDIDATES = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

// Le matching lit les compétences, les réponses validées et les XP pour choisir les aidants
// (lecture seule de tables d'autres modules, comme le prévoit 08-algorithmes.md § 1). Il n'écrit
// que dans match_events, et passe par Notifier pour les notifications.
@Injectable()
export class PrismaMatchingStore implements MatchingStore, ClaimStore {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestion(questionId: string, now: Date): Promise<MatchingQuestion | null> {
    const q = await this.prisma.question.findFirst({
      where: { id: questionId, hiddenAt: null },
      select: {
        id: true,
        title: true,
        authorId: true,
        status: true,
        lang: true,
        author: { select: { isDemo: true, timezone: true } },
        tags: { select: { tag: { select: { id: true, label: true } } } },
        _count: { select: { answers: { where: { hiddenAt: null } } } },
        matchEvents: { select: { wave: true, claimedAt: true, answeredAt: true } },
      },
    });
    if (!q) return null;
    // Un « Je m'en occupe » expire après 20 minutes sans réponse de cet aidant (S11).
    const expiries = q.matchEvents
      .filter((m) => m.claimedAt !== null && m.answeredAt === null)
      .map((m) => m.claimedAt!.getTime() + MATCHING.claimExpiresMinutes * 60_000)
      .filter((t) => t > now.getTime());
    return {
      id: q.id,
      title: q.title,
      authorId: q.authorId,
      authorIsDemo: q.author.isDemo,
      authorTimezone: q.author.timezone,
      status: q.status,
      lang: q.lang,
      tags: q.tags.map((t) => t.tag),
      answerCount: q._count.answers,
      claimExpiresAt: expiries.length > 0 ? new Date(Math.max(...expiries)) : null,
      wavesDone: [...new Set(q.matchEvents.map((m) => m.wave))],
    };
  }

  acceptedAnswersOnPlatform(): Promise<number> {
    return this.prisma.answer.count({ where: { isAccepted: true, hiddenAt: null } });
  }

  async candidates(
    question: MatchingQuestion,
    activeSince: Date,
    now: Date,
  ): Promise<MatchCandidate[]> {
    const tagIds = question.tags.map((t) => t.id);
    // Présélection (§6.2) : actif, différent de l'auteur, sans « ne pas déranger », pas déjà
    // sollicité pour cette question, compte démo seulement si l'auteur en est un, et au moins
    // une étiquette commune (compétence ou « Je peux aider »).
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT u.id FROM users u
      WHERE u.deleted_at IS NULL
        AND u.id <> ${question.authorId}::uuid
        AND u.do_not_disturb = false
        AND u.last_seen_at >= ${activeSince}
        AND (u.is_demo = false OR ${question.authorIsDemo})
        AND NOT EXISTS (
          SELECT 1 FROM match_events m WHERE m.question_id = ${question.id}::uuid AND m.helper_id = u.id
        )
        AND (
          EXISTS (
            SELECT 1 FROM user_skills s
            WHERE s.user_id = u.id AND s.tag_id = ANY(${tagIds}::uuid[]) AND s.score > 0
          )
          OR u.can_help_tag_ids && ${tagIds}::uuid[]
        )
      ORDER BY u.last_seen_at DESC
      LIMIT ${MAX_CANDIDATES}`;
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return [];

    const since24h = new Date(now.getTime() - DAY_MS);
    const [users, skills, accepted, xp, recent, last] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          timezone: true,
          availability: true,
          languages: true,
          canHelpTagIds: true,
        },
      }),
      this.prisma.userSkill.findMany({
        where: { userId: { in: ids }, score: { gt: 0 } },
        select: { userId: true, tagId: true, githubSignal: true },
      }),
      this.prisma.answer.findMany({
        where: { authorId: { in: ids }, isAccepted: true, hiddenAt: null },
        select: { authorId: true, question: { select: { tags: { select: { tagId: true } } } } },
      }),
      this.prisma.xpEvent.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _sum: { points: true },
      }),
      this.prisma.matchEvent.groupBy({
        by: ['helperId'],
        where: { helperId: { in: ids }, notifiedAt: { gte: since24h } },
        _count: { _all: true },
      }),
      this.prisma.matchEvent.groupBy({
        by: ['helperId'],
        where: { helperId: { in: ids } },
        _max: { notifiedAt: true },
      }),
    ]);

    const group = <T, K>(items: T[], key: (t: T) => string, value: (t: T) => K) => {
      const map = new Map<string, K[]>();
      for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), value(item)]);
      return map;
    };
    const skillsBy = group(
      skills,
      (s) => s.userId,
      (s) => s,
    );
    const acceptedBy = group(
      accepted,
      (a) => a.authorId,
      (a) => a.question.tags.map((t) => t.tagId),
    );
    const xpBy = new Map(xp.map((x) => [x.userId, x._sum.points ?? 0]));
    const recentBy = new Map(recent.map((r) => [r.helperId, r._count._all]));
    const lastBy = new Map(last.map((r) => [r.helperId, r._max.notifiedAt]));

    return users.map((u) => {
      const offset = timezoneOffsetMinutes(u.timezone, now);
      const own = skillsBy.get(u.id) ?? [];
      return {
        userId: u.id,
        acceptedAnswerTagIds: acceptedBy.get(u.id) ?? [],
        skillTagIds: own.map((s) => s.tagId),
        githubSignalByTag: Object.fromEntries(own.map((s) => [s.tagId, s.githubSignal])),
        canHelpTagIds: u.canHelpTagIds,
        offsetMinutes: offset,
        availability: availabilityAt(u.availability as AvailabilitySettings | null, offset, now),
        totalXp: xpBy.get(u.id) ?? 0,
        languages: u.languages,
        recentRequests: recentBy.get(u.id) ?? 0,
        lastRequestedAt: lastBy.get(u.id) ?? null,
      };
    });
  }

  async recordWave(events: NewMatchEvent[], notify: (tx: unknown) => Promise<void>): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.matchEvent.createMany({
        data: events.map((e) => ({
          questionId: e.questionId,
          helperId: e.helperId,
          wave: e.wave,
          rank: e.rank,
          score: e.score,
          regime: e.regime,
          reasons: e.reasons as Prisma.InputJsonValue,
        })),
      });
      await notify(tx);
    });
  }

  async markEscalated(questionId: string, at: Date): Promise<void> {
    await this.prisma.question.updateMany({
      where: { id: questionId, escalatedAt: null },
      data: { escalatedAt: at },
    });
  }

  async claim(
    questionId: string,
    helperId: string,
    at: Date,
    tx?: unknown,
  ): Promise<{ claimedAt: Date } | null> {
    const db = (tx as Prisma.TransactionClient | undefined) ?? this.prisma;
    const solicited = await db.matchEvent.findMany({
      where: { questionId, helperId, question: { status: 'open', hiddenAt: null } },
      select: { id: true, claimedAt: true },
    });
    if (solicited.length === 0) return null;
    // Une seule fois par aidant : renouveler le statut bloquerait l'escalade indéfiniment.
    const previous = solicited.find((m) => m.claimedAt !== null)?.claimedAt;
    if (previous) return { claimedAt: previous };
    await db.matchEvent.updateMany({
      where: { id: { in: solicited.map((m) => m.id) } },
      data: { claimedAt: at },
    });
    return { claimedAt: at };
  }

  /** Une réponse d'un aidant sollicité : alimente le temps de première réponse (Y2) et S11. */
  async markAnswered(questionId: string, helperId: string, at: Date, tx?: unknown): Promise<void> {
    const db = (tx as Prisma.TransactionClient | undefined) ?? this.prisma;
    await db.matchEvent.updateMany({
      where: { questionId, helperId, answeredAt: null },
      data: { answeredAt: at },
    });
  }
}
