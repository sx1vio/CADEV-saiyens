import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// État OAuth (paramètre state + PKCE) conservé entre /auth/github et le callback,
// dans un cookie court signé par HMAC (§9 : « OAuth avec paramètre state »).
export interface OAuthState {
  state: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: number;
}

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function newOAuthState(returnTo: string, now: number): OAuthState {
  return {
    state: randomBytes(24).toString('base64url'),
    codeVerifier: randomBytes(32).toString('base64url'),
    returnTo,
    expiresAt: now + OAUTH_STATE_TTL_MS,
  };
}

export function codeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function sealOAuthState(value: OAuthState, secret: string): string {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/** Renvoie l'état si la signature est valide, s'il n'a pas expiré et si le state reçu correspond. */
export function openOAuthState(
  sealed: string | undefined,
  receivedState: string | undefined,
  secret: string,
  now: number,
): OAuthState | null {
  if (!sealed || !receivedState) return null;
  const [payload, signature] = sealed.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let value: OAuthState;
  try {
    value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
  } catch {
    return null;
  }
  if (typeof value.expiresAt !== 'number' || value.expiresAt < now) return null;
  const a = Buffer.from(value.state ?? '');
  const b = Buffer.from(receivedState);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

/** N'accepte qu'un chemin interne (« /sos/42 ») pour éviter les redirections ouvertes. */
export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return '/';
  }
  return value.slice(0, 512);
}
