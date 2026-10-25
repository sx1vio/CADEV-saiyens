import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from './scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('vérifie le bon mot de passe, refuse les autres', async () => {
    const stored = await hasher.hash('une phrase sûre');
    expect(stored).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(stored).not.toContain('une phrase');
    expect(await hasher.verify('une phrase sûre', stored)).toBe(true);
    expect(await hasher.verify('une phrase sure', stored)).toBe(false);
  });

  it('sale chaque hash', async () => {
    expect(await hasher.hash('même')).not.toBe(await hasher.hash('même'));
  });

  it('refuse un hash mal formé sans lever', async () => {
    expect(await hasher.verify('x', 'bcrypt$abc')).toBe(false);
    expect(await hasher.verify('x', '')).toBe(false);
  });
});
