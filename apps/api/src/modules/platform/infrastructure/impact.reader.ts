import { Injectable } from '@nestjs/common';
import type { ImpactResponse } from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const CACHE_MS = 60_000;

// Y2 : chiffres d'impact publics, calculés sur les vraies données (comptes de démo exclus).
@Injectable()
export class ImpactReader {
  private cache: { at: number; value: ImpactResponse } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async impact(): Promise<ImpactResponse> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const value = await this.compute(this.prisma);
    this.cache = { at: Date.now(), value };
    return value;
  }

  /** Calcul sans cache, sur la connexion fournie (une transaction pour les tests, BUG-038). */
  async compute(db: Pick<Prisma.TransactionClient, '$queryRaw'>): Promise<ImpactResponse> {
    const rows = await db.$queryRaw<
      Array<{
        devs: number;
        asked: number;
        resolved: number;
        median: number | null;
        countries: number;
        rooms: number;
        verified: number;
        cross: number;
      }>
    >`
      WITH real_users AS (
        SELECT id, country, privacy FROM users WHERE NOT is_demo AND deleted_at IS NULL
      ),
      real_questions AS (
        SELECT q.id, q.created_at, q.author_id, q.status, q.lang
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
          WHERE r.hidden_at IS NULL AND r.visibility = 'public')::int AS rooms,
        (SELECT COUNT(*) FROM tasks t
          JOIN rooms r ON r.id = t.room_id AND r.hidden_at IS NULL AND r.visibility = 'public'
          JOIN real_users a ON a.id = t.assignee_id
          WHERE t.status = 'done' AND t.verification = 'github_verified')::int AS verified,
        (SELECT COUNT(*) FROM real_questions q
          JOIN answers a ON a.question_id = q.id AND a.is_accepted AND a.hidden_at IS NULL
          JOIN users h ON h.id = a.author_id AND NOT h.is_demo
          -- Langues non déclarées (profil vide, compte anonymisé) : pas un échange entre langues.
          WHERE cardinality(h.languages) > 0 AND NOT (q.lang = ANY (h.languages)))::int AS cross`;
    const row = rows[0]!; // une seule ligne d'agrégats, toujours présente
    const value: ImpactResponse = {
      registeredDevs: row.devs,
      questionsAsked: row.asked,
      questionsResolved: row.resolved,
      medianFirstResponseMinutes: row.median === null ? null : Math.round(row.median),
      countries: row.countries,
      projectRooms: row.rooms,
      verifiedContributions: row.verified,
      crossLanguageAnswers: row.cross,
      computedAt: new Date().toISOString(),
    };
    return value;
  }
}
