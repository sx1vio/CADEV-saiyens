import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from '../domain/ports';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// Paramètres OWASP pour scrypt (N = 2^15, r = 8, p = 1) ; stockés avec le hash pour pouvoir
// les relever plus tard sans casser les comptes existants. Format : scrypt$N$r$p$sel$clé (base64url).
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const MAX_MEM = 64 * 1024 * 1024;

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
      N,
      r: R,
      p: P,
      maxmem: MAX_MEM,
    });
    return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$');
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [scheme, n, r, p, salt, key] = stored.split('$');
    if (scheme !== 'scrypt' || !n || !r || !p || !salt || !key) return false;
    const expected = Buffer.from(key, 'base64url');
    const actual = await scryptAsync(
      password.normalize('NFKC'),
      Buffer.from(salt, 'base64url'),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEM },
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
