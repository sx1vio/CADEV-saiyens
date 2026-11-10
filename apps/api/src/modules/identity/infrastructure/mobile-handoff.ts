import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { codeChallenge } from './oauth-state';

// Retour de la connexion GitHub vers l'application mobile (ADR-0021, RFC 8252).
// Le callback ouvre la session, puis la remet à l'application dans un code court, chiffré
// (AES-256-GCM) : le jeton n'apparaît jamais en clair dans l'URL `devhub://…`. Le code ne
// s'échange qu'avec le secret PKCE de l'application, absent de l'URL : une autre application
// qui intercepterait le schéma `devhub://` ne peut rien en faire.

export const MOBILE_HANDOFF_TTL_MS = 2 * 60 * 1000;

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface MobileHandoff {
  sessionToken: string;
  sessionExpiresAt: string;
}

interface Sealed {
  t: string;
  e: string;
  c: string;
  x: number;
}

// Clé dédiée, dérivée du secret de session : un code mobile ne peut pas servir ailleurs.
function key(secret: string): Buffer {
  return createHash('sha256').update(`devhub:mobile-handoff:${secret}`).digest();
}

export function sealMobileHandoff(
  handoff: MobileHandoff,
  appChallenge: string,
  secret: string,
  now: number,
): string {
  const payload: Sealed = {
    t: handoff.sessionToken,
    e: handoff.sessionExpiresAt,
    c: appChallenge,
    x: now + MOBILE_HANDOFF_TTL_MS,
  };
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

/** Renvoie la session si le code est intact, non expiré, et si le secret PKCE correspond. */
export function openMobileHandoff(
  code: string,
  codeVerifier: string,
  secret: string,
  now: number,
): MobileHandoff | null {
  const buf = Buffer.from(code, 'base64url');
  if (buf.length <= IV_LENGTH + TAG_LENGTH) return null;

  let payload: Sealed;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(secret), buf.subarray(0, IV_LENGTH));
    decipher.setAuthTag(buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
    const plain = Buffer.concat([
      decipher.update(buf.subarray(IV_LENGTH + TAG_LENGTH)),
      decipher.final(),
    ]).toString('utf8');
    payload = JSON.parse(plain) as Sealed;
  } catch {
    return null;
  }
  if (typeof payload.x !== 'number' || payload.x < now) return null;

  const expected = Buffer.from(payload.c ?? '');
  const actual = Buffer.from(codeChallenge(codeVerifier));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return { sessionToken: payload.t, sessionExpiresAt: payload.e };
}

/** Défi PKCE S256 envoyé par l'application : 43 caractères base64url (SHA-256). */
export function isCodeChallenge(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}
