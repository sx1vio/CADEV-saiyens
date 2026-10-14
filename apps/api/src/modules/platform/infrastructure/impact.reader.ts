import { Injectable } from '@nestjs/common';
import type { ImpactResponse } from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const CACHE_MS = 60_000;

// Y2 : chiffres d'impact publics, calculés sur les vraies données (comptes de démo exclus).
@Injectable()
export class ImpactReader {
  private cache: { at: number; value: ImpactResponse } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async impact(): Promise<ImpactResponse> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const rows = await this.prisma.$queryRaw<
      Array<{
        devs: number;
        asked: number;
        resolved: number;
        median: number | null;
        countries: number;
        rooms: number;
      }>
    >`
      WITH real_users AS (
        SELECT id, country, privacy FROM users WHERE NOT is_demo AND deleted_at IS NULL
      ),
      real_questions AS (
        SELECT q.id, q.created_at, q.author_id, q.status
        FROM questions q JOIN real_users u ON u.id = q.author_id
        WHERE q.hidden_at IS NULL
      ),
      first_answer AS (
        SELECT EXTRACT(EPOCH FROM (MIN(a.created_at) - q.created_at)) / 60 AS minutes
        FROM real_questions q
        JOIN answers a ON a.question_id = q.id AND a.author_id <> q.author_id AND a.hidden_at IS NULL
        JOIN real_users h ON h.id = a.author_id
        GROUP BY q.id, q.created_at
      )
      SELECT
        (SELECT COUNT(*) FROM real_users)::int AS devs,
        (SELECT COUNT(*) FROM real_questions)::int AS asked,
        (SELECT COUNT(*) FROM real_questions WHERE status = 'resolved')::int AS resolved,
        (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes) FROM first_answer)::float AS median,
        (SELECT COUNT(DISTINCT country) FROM real_users
          WHERE country IS NOT NULL
            AND COALESCE((privacy ->> 'hideCountry')::boolean, false) = false
            AND COALESCE((privacy ->> 'country')::boolean, true) = true)::int AS countries,
        (SELECT COUNT(*) FROM rooms r JOIN real_users o ON o.id = r.owner_id
          WHERE r.hidden_at IS NULL AND r.visibility = 'public')::int AS rooms`;
    const row = rows[0]!; // une seule ligne d'agrégats, toujours présente
    const value: ImpactResponse = {
      registeredDevs: row.devs,
      questionsAsked: row.asked,
      questionsResolved: row.resolved,
      medianFirstResponseMinutes: row.median === null ? null : Math.round(row.median),
      countries: row.countries,
      projectRooms: row.rooms,
      computedAt: new Date().toISOString(),
    };
    this.cache = { at: Date.now(), value };
    return value;
  }
}
