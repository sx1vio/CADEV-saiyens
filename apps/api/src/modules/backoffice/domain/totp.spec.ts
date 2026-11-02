import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, newTotpSecret, otpauthUrl, totpAt, verifyTotp } from './totp';

// Vecteurs de la RFC 6238, annexe B (SHA-1, secret ASCII « 12345678901234567890 »), sur 6 chiffres.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP (RFC 6238)', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('à t = %i s, le code vaut %s', (t, code) => {
    expect(totpAt(RFC_SECRET, new Date(t * 1000))).toBe(code);
  });

  it('accepte le code courant et un pas de décalage, refuse au-delà', () => {
    const secret = newTotpSecret();
    const now = new Date('2026-11-02T10:00:15Z');
    expect(verifyTotp(secret, totpAt(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, new Date(now.getTime() - 30_000)), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, new Date(now.getTime() + 30_000)), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, new Date(now.getTime() - 90_000)), now)).toBe(false);
  });

  it('refuse un code mal formé', () => {
    const secret = newTotpSecret();
    for (const code of ['', '12345', '1234567', 'abcdef', '12 456'])
      expect(verifyTotp(secret, code, new Date())).toBe(false);
  });

  it('base32 : aller-retour sans perte, secret de 160 bits', () => {
    const secret = newTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
  });

  it('lien otpauth lisible par les applications', () => {
    const url = otpauthUrl('JBSWY3DPEHPK3PXP', 'admin@devhub.africa');
    expect(url).toMatch(/^otpauth:\/\/totp\/DevHub%20Admin%3Aadmin%40devhub\.africa\?/);
    expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(url).toContain('digits=6');
  });
});
