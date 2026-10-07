import { describe, expect, it } from 'vitest';
import { testEnvSource } from '../../../test/env.fixture';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('applique les valeurs par défaut', () => {
    const env = parseEnv({ ...testEnvSource, NODE_ENV: 'development' });
    expect(env.PORT).toBe(3000);
    expect(env.PROCESS_ROLE).toBe('http');
    expect(env.AUTH_FAKE_PROVIDER).toBe(false);
  });

  it('refuse une configuration sans DATABASE_URL', () => {
    const { DATABASE_URL: _, ...rest } = testEnvSource;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('refuse une clé de chiffrement qui ne fait pas 32 octets', () => {
    expect(() => parseEnv({ ...testEnvSource, TOKEN_ENCRYPTION_KEY: 'trop-courte' })).toThrow(
      /TOKEN_ENCRYPTION_KEY/,
    );
  });

  it('refuse un secret de session trop court', () => {
    expect(() => parseEnv({ ...testEnvSource, SESSION_SECRET: 'court' })).toThrow(/SESSION_SECRET/);
  });

  it('exige les identifiants GitHub sans faux fournisseur, et traite une valeur vide comme absente', () => {
    expect(() => parseEnv({ ...testEnvSource, GITHUB_CLIENT_ID: '' })).toThrow(/GITHUB_CLIENT_ID/);
  });

  it('accepte le faux fournisseur sans identifiants GitHub, hors production', () => {
    const env = parseEnv({
      ...testEnvSource,
      NODE_ENV: 'test',
      AUTH_FAKE_PROVIDER: 'true',
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '',
    });
    expect(env.AUTH_FAKE_PROVIDER).toBe(true);
  });

  it('interdit le faux fournisseur OAuth en production', () => {
    expect(() =>
      parseEnv({ ...testEnvSource, NODE_ENV: 'production', AUTH_FAKE_PROVIDER: 'true' }),
    ).toThrow(/AUTH_FAKE_PROVIDER/);
  });
});
