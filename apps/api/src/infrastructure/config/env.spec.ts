import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const base = {
  APP_URL: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://devhub:devhub@localhost:5432/devhub',
};

describe('parseEnv', () => {
  it('applique les valeurs par défaut', () => {
    const env = parseEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.PROCESS_ROLE).toBe('http');
    expect(env.AUTH_FAKE_PROVIDER).toBe(false);
  });

  it('refuse une configuration sans DATABASE_URL', () => {
    expect(() => parseEnv({ APP_URL: base.APP_URL })).toThrow(/DATABASE_URL/);
  });

  it('interdit le faux fournisseur OAuth en production', () => {
    expect(() => parseEnv({ ...base, NODE_ENV: 'production', AUTH_FAKE_PROVIDER: 'true' })).toThrow(
      /AUTH_FAKE_PROVIDER/,
    );
  });

  it('autorise le faux fournisseur OAuth en test', () => {
    expect(
      parseEnv({ ...base, NODE_ENV: 'test', AUTH_FAKE_PROVIDER: 'true' }).AUTH_FAKE_PROVIDER,
    ).toBe(true);
  });
});
