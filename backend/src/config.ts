/**
 * Configuration par variables d'environnement (jamais de secret dans le dépôt).
 * Voir `.env.example` pour la liste complète et comment obtenir chaque valeur.
 */
import { existsSync, readFileSync } from 'node:fs'

// Chargement minimal d'un fichier .env local (développement), sans dépendance.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const env = (k: string, d = '') => process.env[k] ?? d

export const config = {
  port: Number(env('PORT', '8787')),
  host: env('HOST', '127.0.0.1'),
  /** URL publique du front (redirections OAuth) */
  appUrl: env('APP_URL', 'http://localhost:5199'),
  /** URL publique de l'API (callbacks OAuth). En dev, le front proxifie /api. */
  apiUrl: env('API_URL', 'http://localhost:5199'),
  /** PostgreSQL en production (Systalink). Vide → PGlite embarqué dans .data/ */
  databaseUrl: env('DATABASE_URL'),
  dataDir: env('DATA_DIR', '.data/pg'),
  isProd: env('NODE_ENV') === 'production',
  /** Jeton GitHub facultatif : relève la limite de l'API (60 → 5 000 requêtes/heure) */
  githubToken: env('GITHUB_TOKEN'),
  oauth: {
    github: { clientId: env('GITHUB_CLIENT_ID'), clientSecret: env('GITHUB_CLIENT_SECRET') },
    gitlab: { clientId: env('GITLAB_CLIENT_ID'), clientSecret: env('GITLAB_CLIENT_SECRET'), baseUrl: env('GITLAB_BASE_URL', 'https://gitlab.com') },
    google: { clientId: env('GOOGLE_CLIENT_ID'), clientSecret: env('GOOGLE_CLIENT_SECRET') },
  },
  /** Fréquence de collecte des actualités (minutes) */
  ingestEveryMinutes: Number(env('INGEST_EVERY_MINUTES', '15')),
  /** Désactive la collecte (tests) */
  ingestDisabled: env('INGEST_DISABLED') === '1',
}

export type Provider = keyof typeof config.oauth
