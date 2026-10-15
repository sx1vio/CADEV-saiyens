import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout du front (03-frontend.md) : le build de production (`vite preview`)
 * contre l'API réelle, avec le faux fournisseur GitHub (AUTH_FAKE_PROVIDER=true).
 *
 * Prérequis : `pnpm build` (fait par `pnpm test:e2e` via Turborepo) et une base PostgreSQL
 * dédiée dans DATABASE_URL ; les migrations y sont appliquées au démarrage (l'API aligne
 * elle-même les étiquettes de référence). Ports : E2E_API_PORT (3001) et E2E_WEB_PORT (5174) par défaut.
 */
const apiPort = Number(process.env.E2E_API_PORT ?? 3001);
const webPort = Number(process.env.E2E_WEB_PORT ?? 5174);
const webUrl = `http://localhost:${webPort}`;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL est obligatoire pour les tests e2e (base dédiée).');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // Une seule base partagée : les fichiers passent l'un après l'autre.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: webUrl,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // API compilée (apps/api/dist) ; le web sert de point d'entrée, comme Caddy en production.
      command: 'pnpm --filter @devhub/api exec prisma migrate deploy && node ../api/dist/main.js',
      url: `http://127.0.0.1:${apiPort}/api/v1/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(apiPort),
        APP_URL: webUrl,
        API_URL: webUrl,
        DATABASE_URL: databaseUrl,
        SESSION_SECRET: 'e2e-session-secret-'.padEnd(48, 'x'),
        TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
        AUTH_FAKE_PROVIDER: 'true',
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: `pnpm exec vite preview --port ${webPort} --strictPort`,
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { DEVHUB_API_PROXY: `http://127.0.0.1:${apiPort}` },
    },
  ],
});
