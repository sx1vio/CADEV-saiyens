// Variables d'environnement minimales et valides pour les tests.
export const testEnvSource = {
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:5173',
  API_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://devhub:devhub@localhost:5432/devhub',
  SESSION_SECRET: 'x'.repeat(48),
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
};

/** Complète process.env sans écraser ce qui est déjà défini (CI, .env local). */
export function applyTestEnv(overrides: Record<string, string> = {}): void {
  for (const [key, value] of Object.entries({ ...testEnvSource, ...overrides })) {
    if (overrides[key] !== undefined || process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}
