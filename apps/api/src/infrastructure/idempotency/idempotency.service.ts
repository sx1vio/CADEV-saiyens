import { createHash } from 'node:crypto';
import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type Tx = Prisma.TransactionClient;

/** Réponse d'une écriture, enregistrée pour être rejouée à l'identique. */
export interface WriteResult<T> {
  status: number;
  body: T;
  /** Effets après validation de la transaction (jobs, notifications) ; jamais sur un rejeu. */
  afterCommit?: () => Promise<void>;
}

export interface IdempotentOutcome<T> {
  status: number;
  body: T;
  replayed: boolean;
}

export interface IdempotentRequest {
  userId: string;
  key: string;
  /** Méthode et route, ex. « POST /questions ». */
  endpoint: string;
  body: unknown;
}

/** Empreinte du corps normalisé (clés triées) : même clé + autre corps = clé réutilisée. */
export function requestHash(endpoint: string, body: unknown): string {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value as Record<string, unknown>)
          .sort()
          .map((k) => [k, canonical((value as Record<string, unknown>)[k])]),
      );
    }
    return value;
  };
  return createHash('sha256')
    .update(JSON.stringify([endpoint, canonical(body ?? null)]))
    .digest('hex');
}

/**
 * Idempotence des écritures (ADR-0008, docs/architecture/04-hors-ligne-sync.md § 3).
 * La clé et l'effet métier sont enregistrés dans la même transaction : impossible d'avoir l'un
 * sans l'autre. Rejouer une action renvoie la réponse d'origine, sans doublon.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    request: IdempotentRequest,
    work: (tx: Tx) => Promise<WriteResult<T>>,
  ): Promise<IdempotentOutcome<T>> {
    const hash = requestHash(request.endpoint, request.body);

    const outcome = await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.$executeRaw`
        INSERT INTO idempotency_keys (user_id, key, endpoint, request_hash, status)
        VALUES (${request.userId}::uuid, ${request.key}::uuid, ${request.endpoint}, ${hash}, 'processing')
        ON CONFLICT DO NOTHING`;

      if (inserted === 0) {
        const existing = await tx.idempotencyKey.findUniqueOrThrow({
          where: { userId_key: { userId: request.userId, key: request.key } },
        });
        if (existing.requestHash !== hash) {
          throw new UnprocessableEntityException({
            code: 'idempotency_key.reused',
            title: 'Idempotency key reused with a different request',
          });
        }
        if (existing.status !== 'completed') {
          throw new ConflictException({
            code: 'idempotency_key.in_progress',
            title: 'A request with this idempotency key is in progress',
          });
        }
        return {
          status: existing.responseStatus ?? 200,
          body: existing.responseBody as T,
          replayed: true,
          afterCommit: undefined,
        };
      }

      const result = await work(tx);
      await tx.idempotencyKey.update({
        where: { userId_key: { userId: request.userId, key: request.key } },
        data: {
          status: 'completed',
          responseStatus: result.status,
          responseBody: result.body as Prisma.InputJsonValue,
        },
      });
      return { ...result, replayed: false };
    });

    if (outcome.afterCommit) await outcome.afterCommit();
    return { status: outcome.status, body: outcome.body, replayed: outcome.replayed };
  }
}
