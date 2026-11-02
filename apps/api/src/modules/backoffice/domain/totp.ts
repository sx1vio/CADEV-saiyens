import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Codes à usage unique basés sur le temps (TOTP, RFC 6238) : HMAC-SHA1, pas de 30 s, 6 chiffres,
// compatibles avec toutes les applications d'authentification (Google Authenticator, Aegis, 1Password…).

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_S = 30;
const DIGITS = 6;

/** Secret aléatoire de 160 bits, encodé en base32 (format attendu par les applications). */
export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Code valable pour un instant donné (exporté pour les tests et la CLI). */
export function totpAt(secret: string, at: Date): string {
  const counter = Math.floor(at.getTime() / 1000 / STEP_S);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    (hmac[offset + 1]! << 16) |
    (hmac[offset + 2]! << 8) |
    hmac[offset + 3]!;
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Vérifie un code en tolérant un pas de décalage d'horloge de chaque côté (± 30 s).
 * Comparaison à temps constant.
 */
export function verifyTotp(secret: string, code: string, now: Date): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  let ok = false;
  for (const drift of [-1, 0, 1]) {
    const expected = totpAt(secret, new Date(now.getTime() + drift * STEP_S * 1000));
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) ok = true;
  }
  return ok;
}

/** Lien à scanner (QR code) ou à coller dans l'application d'authentification. */
export function otpauthUrl(secret: string, account: string, issuer = 'DevHub Admin'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_S),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Secret TOTP invalide (base32 attendu)');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
