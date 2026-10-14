import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { SyncAction, SyncResult } from '@devhub/contracts';
import { ActionRegistry, runAction } from '../../../infrastructure/actions/action-registry';
import { toProblem } from '../../../infrastructure/http/problem-details.filter';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const CLIENT_REF = 'client:';
const CREATIONS = new Set(['question.create', 'answer.create']);

/** Erreurs passagères : l'action reste en attente côté client et sera renvoyée. */
const isTransient = (status: number, code: string) =>
  status >= 500 || status === 429 || code === 'idempotency_key.in_progress';

/**
 * O2 : traite un lot d'actions hors ligne **dans l'ordre**, chacune dans sa propre transaction,
 * avec les mêmes règles d'idempotence que les endpoints unitaires (04-hors-ligne-sync.md § 4).
 * Le lot ne s'interrompt jamais : seules les actions qui dépendent d'une création échouée
 * sont « skipped ».
 */
@Injectable()
export class SyncBatch {
  private readonly logger = new Logger(SyncBatch.name);

  constructor(
    private readonly registry: ActionRegistry,
    private readonly idempotency: IdempotencyService,
    private readonly prisma: PrismaService,
  ) {}

  async run(userId: string, actions: SyncAction[]): Promise<SyncResult[]> {
    const created = new Map<string, string>();
    const failed = new Set<string>();
    const results: SyncResult[] = [];

    for (const action of actions) {
      const payload: Record<string, unknown> = { ...action.payload };
      if (action.baseVersion !== undefined) payload.baseVersion = action.baseVersion;
      const clientId = typeof payload.clientId === 'string' ? payload.clientId : null;
      const markFailed = () => {
        if (CREATIONS.has(action.type) && clientId) failed.add(clientId);
      };
      const definition = this.registry.get(action.type);
      if (!definition) {
        results.push(rejected(action.opId, 400, 'validation.failed', 'Unknown action type'));
        markFailed();
        continue;
      }

      // Références vers des entités créées hors ligne : « client:<uuid> ».
      let blocked: SyncResult | null = null;
      for (const ref of definition.refs ?? []) {
        const value = payload[ref.field];
        if (typeof value !== 'string' || !value.startsWith(CLIENT_REF)) continue;
        const refId = value.slice(CLIENT_REF.length);
        if (failed.has(refId)) {
          blocked = {
            opId: action.opId,
            status: 'skipped',
            httpStatus: 424,
            error: {
              code: 'sync.dependency_failed',
              title: 'A dependency failed in this batch',
              status: 424,
            },
          };
          break;
        }
        const resolved = created.get(refId) ?? (await this.lookup(ref.kind, userId, refId));
        if (!resolved) {
          blocked = rejected(action.opId, 404, 'not_found', 'Referenced content not found');
          break;
        }
        payload[ref.field] = resolved;
      }
      if (blocked) {
        results.push(blocked);
        markFailed();
        continue;
      }

      const parsed = definition.schema.safeParse(payload);
      if (!parsed.success) {
        results.push({
          ...rejected(action.opId, 400, 'validation.failed', 'Validation failed'),
          error: {
            code: 'validation.failed',
            title: 'Validation failed',
            status: 400,
            errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), code: i.code })),
          },
        });
        markFailed();
        continue;
      }

      try {
        const outcome = await runAction(
          this.idempotency,
          definition,
          userId,
          action.opId,
          parsed.data,
        );
        const body = outcome.body as { id?: string };
        if (CREATIONS.has(action.type) && clientId && body.id) created.set(clientId, body.id);
        results.push({
          opId: action.opId,
          status: outcome.replayed ? 'duplicate' : 'applied',
          httpStatus: outcome.status,
          data: outcome.body,
        });
      } catch (err) {
        markFailed();
        if (!(err instanceof HttpException)) {
          this.logger.error({ err, opId: action.opId }, 'Action de synchronisation en échec');
          results.push({
            opId: action.opId,
            status: 'skipped',
            httpStatus: 500,
            error: { code: 'internal', title: 'Internal Server Error', status: 500 },
          });
          continue;
        }
        const problem = toProblem(err, '/api/v1/sync');
        if (problem.code === 'version_conflict') {
          results.push({
            opId: action.opId,
            status: 'conflict',
            httpStatus: 409,
            data: { server: problem.server },
          });
        } else {
          results.push({
            opId: action.opId,
            status: isTransient(problem.status, problem.code) ? 'skipped' : 'rejected',
            httpStatus: problem.status,
            error: { ...problem },
          });
        }
      }
    }
    return results;
  }

  /** Une entité déjà synchronisée, retrouvée par son clientId (filet de sécurité de 04 § 2). */
  private async lookup(kind: 'question' | 'answer', authorId: string, clientId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(clientId)) return null;
    const where = { authorId_clientId: { authorId, clientId } };
    const row =
      kind === 'question'
        ? await this.prisma.question.findUnique({ where, select: { id: true } })
        : await this.prisma.answer.findUnique({ where, select: { id: true } });
    return row?.id ?? null;
  }
}

function rejected(opId: string, status: number, code: string, title: string): SyncResult {
  return { opId, status: 'rejected', httpStatus: status, error: { code, title, status } };
}
