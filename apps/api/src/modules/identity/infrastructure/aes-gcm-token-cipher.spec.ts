import { describe, expect, it } from 'vitest';
import { AesGcmTokenCipher } from './aes-gcm-token-cipher';

const key = Buffer.alloc(32, 3).toString('base64');

describe('AesGcmTokenCipher', () => {
  it('chiffre puis déchiffre un jeton', () => {
    const cipher = new AesGcmTokenCipher(key);
    const sealed = cipher.encrypt('gho_abc123');
    expect(Buffer.from(sealed).toString('utf8')).not.toContain('gho_abc123');
    expect(cipher.decrypt(sealed)).toBe('gho_abc123');
  });

  it('produit un résultat différent à chaque chiffrement (IV aléatoire)', () => {
    const cipher = new AesGcmTokenCipher(key);
    expect(Buffer.from(cipher.encrypt('x')).equals(Buffer.from(cipher.encrypt('x')))).toBe(false);
  });

  it('refuse un contenu altéré', () => {
    const cipher = new AesGcmTokenCipher(key);
    const sealed = Buffer.from(cipher.encrypt('gho_abc123'));
    sealed[sealed.length - 1]! ^= 0xff;
    expect(() => cipher.decrypt(sealed)).toThrow();
  });

  it('refuse une clé de mauvaise taille', () => {
    expect(() => new AesGcmTokenCipher(Buffer.alloc(16).toString('base64'))).toThrow();
  });
});
