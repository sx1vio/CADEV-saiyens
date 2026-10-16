import { createHmac, timingSafeEqual } from 'node:crypto';

// Y3 : lien de désabonnement sans connexion. Jeton = identifiant du compte + signature HMAC
// (clé dérivée de SESSION_SECRET) : impossible à fabriquer pour un autre compte.
const sign = (secret: string, userId: string) =>
  createHmac('sha256', `unsubscribe:${secret}`).update(userId).digest('base64url');

export const unsubscribeToken = (secret: string, userId: string) =>
  `${userId}.${sign(secret, userId)}`;

/** Identifiant du compte si le jeton est authentique, sinon null. */
export function verifyUnsubscribeToken(secret: string, token: string): string | null {
  const [userId, sig] = token.split('.');
  if (!userId || !sig || !/^[0-9a-f-]{36}$/.test(userId)) return null;
  const expected = Buffer.from(sign(secret, userId));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? userId : null;
}
