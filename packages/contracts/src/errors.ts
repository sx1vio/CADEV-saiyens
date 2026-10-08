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
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
