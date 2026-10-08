import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { TokenCipher } from '../domain/ports';

// Chiffrement des jetons OAuth au repos (§9) : AES-256-GCM, format iv(12) | tag(16) | données.
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export class AesGcmTokenCipher implements TokenCipher {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, 'base64');
    if (this.key.length !== 32) throw new Error('La clé de chiffrement doit faire 32 octets');
  }

  encrypt(plain: string): Uint8Array {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]);
  }

  decrypt(sealed: Uint8Array): string {
    const buf = Buffer.from(sealed);
    const decipher = createDecipheriv('aes-256-gcm', this.key, buf.subarray(0, IV_LENGTH));
    decipher.setAuthTag(buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
    return Buffer.concat([
      decipher.update(buf.subarray(IV_LENGTH + TAG_LENGTH)),
      decipher.final(),
    ]).toString('utf8');
  }
}
