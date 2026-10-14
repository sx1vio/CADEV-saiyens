import { Injectable } from '@nestjs/common';
import { SCORING, skillLevel } from '@devhub/core';
import type { Availability, PassportResponse } from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { resolvePrivacy, trustSignals } from '../../identity';

/**
 * PR2, PR3 : Passport public, lisible sans compte. Lecture seule (CQRS léger, 02-backend.md) :
 * chaque chiffre est calculé à partir du journal et des contenus, jamais saisi (§6.4). Les
 * champs masqués par l'utilisateur (PR14) ne sortent jamais de l'API.
 */
@Injectable()
export class PassportReader {
  constructor(private readonly prisma: PrismaService) {}

  async byHandle(handle: string): Promise<PassportResponse | null> {
    const u = await this.prisma.user.findFirst({ where: { handle, deletedAt: null } });
    if (!u) return null;
    const privacy = resolvePrivacy(u.privacy);

    const [skills, tags, xp, answers, votes, resolved, median, tasks, reviews, rooms] =
      await Promise.all([
        this.prisma.userSkill.findMany({
          where: { userId: u.id, score: { gt: 0 } },
          include: { tag: { select: { slug: true, label: true } } },
          orderBy: [{ score: 'desc' }],
        }),
        this.prisma.tag.findMany({
          where: { id: { in: [...u.canHelpTagIds, ...u.wantLearnTagIds] } },
          select: { id: true, slug: true, label: true },
        }),
        this.prisma.xpEvent.aggregate({ where: { userId: u.id }, _sum: { points: true } }),
        this.prisma.answer.count({ where: { authorId: u.id, isAccepted: true, hiddenAt: null } }),
        this.prisma.vote.count({ where: { answer: { authorId: u.id, hiddenAt: null } } }),
        this.prisma.question.count({
          where: { authorId: u.id, status: 'resolved', hiddenAt: null },
        }),
        this.prisma.$queryRaw<Array<{ minutes: number | null }>>`
        SELECT percentile_cont(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (a.created_at - q.created_at)) / 60
        )::float AS minutes
        FROM answers a JOIN questions q ON q.id = a.question_id
        WHERE a.author_id = ${u.id}::uuid AND a.is_accepted AND a.hidden_at IS NULL`,
        this.prisma.task.groupBy({
          by: ['verification'],
          where: { assigneeId: u.id, status: 'done', room: { hiddenAt: null } },
          _count: { _all: true },
        }),
        this.prisma.feedbackRequest.count({
          where: { reviewerId: u.id, confirmedAt: { not: null } },
        }),
        this.prisma.roomMember.findMany({
          // Les salles non listées restent privées : seules les salles publiques apparaissent.
          where: { userId: u.id, room: { hiddenAt: null, visibility: 'public' } },
          include: {
            room: { select: { inviteCode: true, name: true, state: true, repoFullName: true } },
          },
          orderBy: { joinedAt: 'desc' },
          take: 20,
        }),
      ]);

    const tagById = new Map(tags.map((t) => [t.id, { slug: t.slug, label: t.label }]));
    const pick = (ids: string[]) =>
      ids.flatMap((id) => (tagById.has(id) ? [tagById.get(id)!] : []));
    const contributions = tasks.reduce((s, t) => s + t._count._all, 0);
    const minutes = median[0]?.minutes ?? null;

    return {
      user: {
        handle: u.handle,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        country: privacy.hideCountry ? null : u.country,
        timezone: privacy.hideTimezone ? null : u.timezone,
        languages: u.languages,
        lookingFor: u.lookingFor,
        availability: privacy.hideAvailability ? null : (u.availability as Availability),
        isDemo: u.isDemo,
        memberSince: u.createdAt.toISOString(),
      },
      trust: trustSignals(u, new Date()),
      skills: skills.map((s) => ({
        tag: s.tag,
        score: s.score,
        level: skillLevel(s.score),
        githubSignal: s.githubSignal,
        githubRepos: s.githubRepos,
        platformPoints: Math.min(SCORING.platformCap, Math.max(0, s.xpTag)),
      })),
      canHelp: pick(u.canHelpTagIds),
      wantLearn: pick(u.wantLearnTagIds),
      stats: privacy.hideStats
        ? null
        : {
            totalXp: xp._sum.points ?? 0,
            answersAccepted: answers,
            helpfulVotes: votes,
            questionsResolved: resolved,
            medianMinutesToHelp: minutes === null ? null : Math.round(minutes),
            contributions,
            contributionsVerified:
              tasks.find((t) => t.verification === 'github_verified')?._count._all ?? 0,
            reviews,
          },
      projects: rooms.map((m) => ({
        code: m.room.inviteCode,
        name: m.room.name,
        state: m.room.state,
        role: m.role,
        repoFullName: m.room.repoFullName,
      })),
    };
  }
}
