// Codes d'erreur stables renvoyés par l'API (problem+json, champ `code`), traduits par le front.
// docs/architecture/06-api.md#erreurs
export const ERROR_CODES = [
  'validation.failed',
  'auth.required',
  'forbidden',
  'not_found',
  'conflict',
  'unprocessable',
  'rate_limited',
  'internal',
  'csrf.origin_rejected',
  'database.unavailable',
  'github.not_linked',
  'github.token_revoked',
  'github.unavailable',
  // Idempotence (docs/architecture/04-hors-ligne-sync.md#3-idempotence-côté-serveur)
  'idempotency_key.missing',
  'idempotency_key.reused',
  'idempotency_key.in_progress',
  // SOS Dev
  'question.tags_unknown',
  'question.already_resolved',
  'question.not_open',
  'answer.not_found',
  'answer.own_question',
  'xp.self_vote',
  'version_conflict',
  'sync.dependency_failed',
  // Salles de projet
  'room.repo_not_found',
  'room.repo_private',
  'room.not_member',
  'room.already_member',
  'task.already_taken',
  'task.invalid_status',
  'task.pr_invalid',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
