import { Injectable } from '@nestjs/common';
import { type AvailabilitySettings, availabilityAt, timezoneOffsetMinutes } from '@devhub/core';
import type {
  DevCard,
  DiscoverDevsQuery,
  DiscoverDevsResponse,
  LeaderboardQuery,
  LeaderboardResponse,
} from '@devhub/contracts';
import { Prisma } from '../../../generated/prisma/client';
import { afterCursor, decodeCursor, encodeCursor } from '../../../infrastructure/http/cursor';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { resolvePrivacy } from '../../identity';

const BATCH = 100;
const MAX_SCANNED = 1_000;
const TZ_TOLERANCE_MINUTES = 180;

/** Pays visible et compte listé, avec les deux écritures de `privacy` (cf. resolvePrivacy, BUG-020). */
const COUNTRY_VISIBLE = Prisma.sql`COALESCE((u.privacy ->> 'hideCountry')::boolean, false) = false
  AND COALESCE((u.privacy ->> 'country')::boolean, true) = true`;
const LISTED = Prisma.sql`COALESCE((u.privacy ->> 'unlisted')::boolean, false) = false`;

export const LEADERBOARD_METHOD =
  'Somme des Proof XP du journal public (annulations comprises), comptes de démonstration exclus, ' +
  'pays déclaré par le dev et non masqué.';

// Découverte et classement (D1, D2). Module de lecture : il peut joindre plusieurs tables
// (02-backend.md, exception documentée). Respecte le mode non listé et les champs masqués (PR14).
@Injectable()
export class DiscoveryReader {
  constructor(private readonly prisma: PrismaService) {}

  async devs(query: DiscoverDevsQuery, now = new Date()): Promise<DiscoverDevsResponse> {
    const tag = query.tag
      ? await this.prisma.tag.findUnique({ where: { slug: query.tag }, select: { id: true } })
      : undefined;
    if (query.tag && !tag) return { data: [], page: { hasMore: false, nextCursor: null } };

    // Le mode non listé et le pays masqué sont appliqués pendant le parcours, avec
    // resolvePrivacy : un filtre NOT sur une clé JSON absente exclurait tout le monde en SQL.
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(tag
        ? {
            OR: [
              { skills: { some: { tagId: tag.id, score: { gt: 0 } } } },
              { canHelpTagIds: { has: tag.id } },
            ],
          }
        : {}),
      ...(query.country ? { country: query.country } : {}),
      ...(query.lookingFor
        ? { lookingFor: { contains: query.lookingFor, mode: 'insensitive' } }
        : {}),
    };

    // Fuseau et disponibilité se calculent à partir des réglages de chacun : on parcourt par lots
    // jusqu'à remplir la page ; le curseur garde la position du parcours (pagination exacte).
    const picked: Array<Prisma.UserGetPayload<object>> = [];
    let cursor = decodeCursor(query.cursor);
    let scanned = 0;
    let exhausted = false;
    while (picked.length <= query.limit && scanned < MAX_SCANNED) {
      const batch = await this.prisma.user.findMany({
        where: { ...where, ...afterCursor(cursor) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: BATCH,
      });
      if (batch.length === 0) {
        exhausted = true;
        break;
      }
      for (const u of batch) {
        scanned++;
        cursor = { at: u.createdAt.toISOString(), id: u.id };
        const privacy = resolvePrivacy(u.privacy);
        if (privacy.unlisted) continue;
        if (query.country && privacy.hideCountry) continue;
        const offset = timezoneOffsetMinutes(u.timezone, now);
        if (query.tz !== undefined) {
          if (privacy.hideTimezone || offset === null) continue;
          if (Math.abs(offset - query.tz * 60) > TZ_TOLERANCE_MINUTES) continue;
        }
        if (query.available) {
          if (privacy.hideAvailability) continue;
          if (availabilityAt(u.availability as AvailabilitySettings, offset, now) !== 'now')
            continue;
        }
        picked.push(u);
        if (picked.length > query.limit) break;
      }
      if (batch.length < BATCH && picked.length <= query.limit) {
        exhausted = true;
        break;
      }
    }

    const page = picked.slice(0, query.limit);
    const hasMore = picked.length > query.limit || (!exhausted && scanned >= MAX_SCANNED);
    const last = page.at(-1);
    return {
      data: await this.cards(page, now),
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ at: last.createdAt.toISOString(), id: last.id }) : null,
      },
    };
  }

  async leaderboard(query: LeaderboardQuery): Promise<LeaderboardResponse> {
    if (query.scope === 'country') {
      const rows = await this.prisma.$queryRaw<
        Array<{ country: string; total: bigint; devs: bigint }>
      >`
        SELECT u.country, COALESCE(SUM(x.points), 0) AS total, COUNT(DISTINCT u.id) AS devs
        FROM users u LEFT JOIN xp_events x ON x.user_id = u.id
        WHERE u.deleted_at IS NULL AND u.is_demo = false AND u.country IS NOT NULL
          AND ${COUNTRY_VISIBLE} AND ${LISTED}
        GROUP BY u.country
        ORDER BY total DESC, devs DESC, u.country ASC
        LIMIT ${query.limit}`;
      return {
        scope: 'country',
        method: LEADERBOARD_METHOD,
        countries: rows.map((r, i) => ({
          country: r.country,
          totalXp: Number(r.total),
          devs: Number(r.devs),
          rank: i + 1,
        })),
        devs: [],
      };
    }
    const rows = await this.prisma.$queryRaw<
      Array<{
        handle: string;
        display_name: string;
        country: string | null;
        visible: boolean;
        total: bigint;
        is_demo: boolean;
      }>
    >`
      SELECT u.handle, u.display_name, u.country, u.is_demo,
             (${COUNTRY_VISIBLE}) AS visible,
             COALESCE(SUM(x.points), 0) AS total
      FROM users u JOIN xp_events x ON x.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND ${LISTED}
        AND (${query.country ?? null}::text IS NULL OR (u.country = ${query.country ?? null} AND ${COUNTRY_VISIBLE}))
      GROUP BY u.id
      HAVING SUM(x.points) > 0
      ORDER BY total DESC, u.handle ASC
      LIMIT ${query.limit}`;
    return {
      scope: 'devs',
      method: LEADERBOARD_METHOD,
      countries: [],
      devs: rows.map((r, i) => ({
        handle: r.handle,
        displayName: r.display_name,
        country: r.visible ? r.country : null,
        totalXp: Number(r.total),
        rank: i + 1,
        isDemo: r.is_demo,
      })),
    };
  }

  private async cards(users: Array<Prisma.UserGetPayload<object>>, now: Date): Promise<DevCard[]> {
    if (users.length === 0) return [];
    const ids = users.map((u) => u.id);
    const [skills, xp, tags] = await Promise.all([
      this.prisma.userSkill.findMany({
        where: { userId: { in: ids }, score: { gt: 0 } },
        include: { tag: { select: { slug: true, label: true } } },
        orderBy: { score: 'desc' },
      }),
      this.prisma.xpEvent.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _sum: { points: true },
      }),
      this.prisma.tag.findMany({
        where: { id: { in: users.flatMap((u) => u.canHelpTagIds) } },
        select: { id: true, slug: true, label: true },
      }),
    ]);
    const xpBy = new Map(xp.map((x) => [x.userId, x._sum.points ?? 0]));
    const tagBy = new Map(tags.map((t) => [t.id, { slug: t.slug, label: t.label }]));
    return users.map((u) => {
      const privacy = resolvePrivacy(u.privacy);
      const offset = timezoneOffsetMinutes(u.timezone, now);
      return {
        handle: u.handle,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        country: privacy.hideCountry ? null : u.country,
        timezone: privacy.hideTimezone ? null : u.timezone,
        lookingFor: u.lookingFor,
        isDemo: u.isDemo,
        totalXp: xpBy.get(u.id) ?? 0,
        availableNow:
          !privacy.hideAvailability &&
          availabilityAt(u.availability as AvailabilitySettings, offset, now) === 'now',
        topSkills: skills
          .filter((s) => s.userId === u.id)
          .slice(0, 3)
          .map((s) => ({ ...s.tag, score: s.score })),
        canHelp: u.canHelpTagIds.flatMap((id) => (tagBy.has(id) ? [tagBy.get(id)!] : [])),
      };
    });
  }
}
