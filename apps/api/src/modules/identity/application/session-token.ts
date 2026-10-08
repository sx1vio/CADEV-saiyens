import { createHash, randomBytes } from 'node:crypto';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours glissants (ADR-0009)

/** Jeton aléatoire de 256 bits : il ne vit que dans le cookie. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Seule l'empreinte du jeton est stockée : une fuite de la table sessions ne permet pas d'usurper une session. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
