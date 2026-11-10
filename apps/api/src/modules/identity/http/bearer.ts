import type { Request } from 'express';

/** Jeton porté par « Authorization: Bearer … » : null sans en-tête, '' si l'en-tête est mal formé. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1]! : '';
}
