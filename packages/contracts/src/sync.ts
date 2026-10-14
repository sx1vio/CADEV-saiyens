import { z } from 'zod';

// POST /api/v1/sync : lot d'actions hors ligne (docs/architecture/04-hors-ligne-sync.md § 4).

export const SYNC_LIMITS = { actionsPerBatch: 50 } as const;

export const ActionType = z.enum([
  'question.create',
  'question.update',
  'question.claim',
  'answer.create',
  'answer.update',
  'answer.vote',
  'answer.accept',
  'join_request.create',
  'task.take',
  'room_message.create',
]);
export type ActionType = z.infer<typeof ActionType>;

export const SyncAction = z.object({
  /** Identifiant de l'action, utilisé comme Idempotency-Key. */
  opId: z.uuid(),
  type: ActionType,
  /** Validé par le schéma de l'endpoint correspondant ; un identifiant peut valoir « client:<uuid> ». */
  payload: z.record(z.string(), z.unknown()),
  baseVersion: z.number().int().min(1).optional(),
});
export type SyncAction = z.infer<typeof SyncAction>;

export const SyncRequest = z.object({
  actions: z.array(SyncAction).min(1).max(SYNC_LIMITS.actionsPerBatch),
});
export type SyncRequest = z.infer<typeof SyncRequest>;

export const SyncStatus = z.enum(['applied', 'duplicate', 'conflict', 'rejected', 'skipped']);
export type SyncStatus = z.infer<typeof SyncStatus>;

export const SyncResult = z.object({
  opId: z.uuid(),
  status: SyncStatus,
  httpStatus: z.number().int(),
  /** Réponse de l'endpoint (applied, duplicate), ou `{ server }` pour un conflit de version. */
  data: z.unknown().optional(),
  /** Erreur au format problem+json (rejected, skipped). */
  error: z
    .object({ code: z.string(), title: z.string(), status: z.number().int() })
    .passthrough()
    .optional(),
});
export type SyncResult = z.infer<typeof SyncResult>;

export const SyncResponse = z.object({
  results: z.array(SyncResult),
  serverTime: z.iso.datetime(),
});
export type SyncResponse = z.infer<typeof SyncResponse>;
