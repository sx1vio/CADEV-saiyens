/**
 * Accès base de données : le même SQL tourne sur PostgreSQL (production, Systalink)
 * et sur PGlite (PostgreSQL embarqué, développement local sans installation).
 */
import { mkdirSync } from 'node:fs'
import { config } from './config.js'

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  exec(sql: string): Promise<void>
  close(): Promise<void>
  kind: 'postgres' | 'pglite'
}

async function connect(): Promise<Db> {
  if (config.databaseUrl) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 })
    return {
      kind: 'postgres',
      query: async (sql, params) => (await pool.query(sql, params as unknown[])).rows,
      exec: async (sql) => void (await pool.query(sql)),
      close: () => pool.end(),
    }
  }
  const { PGlite } = await import('@electric-sql/pglite')
  mkdirSync(config.dataDir, { recursive: true })
  const lite = new PGlite(config.dataDir)
  await lite.waitReady
  return {
    kind: 'pglite',
    query: async <T,>(sql: string, params?: unknown[]) => (await lite.query<T>(sql, params as unknown[])).rows,
    exec: async (sql) => void (await lite.exec(sql)),
    close: () => lite.close(),
  }
}

/** Migrations versionnées, appliquées une seule fois, dans l'ordre. */
const MIGRATIONS: { id: number; sql: string }[] = [
  {
    id: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS news_items (
        id            TEXT PRIMARY KEY,
        kind          TEXT NOT NULL,             -- article | video | hn | devto | repo | release
        source        TEXT NOT NULL,             -- identifiant de la source
        source_name   TEXT NOT NULL,
        category      TEXT NOT NULL,             -- ia | tech | apple | google | samsung | dev | afrique | cloud | securite
        lang          TEXT NOT NULL DEFAULT 'en',
        title         TEXT NOT NULL,
        summary       TEXT NOT NULL DEFAULT '',
        url           TEXT NOT NULL UNIQUE,
        image         TEXT,
        author        TEXT,
        published_at  TIMESTAMPTZ NOT NULL,
        score         INTEGER NOT NULL DEFAULT 0,
        comments      INTEGER NOT NULL DEFAULT 0,
        extra         JSONB NOT NULL DEFAULT '{}'::jsonb,
        fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS news_cat_date ON news_items (category, published_at DESC);
      CREATE INDEX IF NOT EXISTS news_kind_date ON news_items (kind, published_at DESC);

      CREATE TABLE IF NOT EXISTS ingest_runs (
        id           SERIAL PRIMARY KEY,
        started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at  TIMESTAMPTZ,
        items        INTEGER NOT NULL DEFAULT 0,
        sources_ok   INTEGER NOT NULL DEFAULT 0,
        errors       JSONB NOT NULL DEFAULT '[]'::jsonb
      );

      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        provider      TEXT NOT NULL,             -- github | gitlab | google
        provider_id   TEXT NOT NULL,
        handle        TEXT NOT NULL UNIQUE,
        display_name  TEXT NOT NULL,
        email         TEXT,
        avatar_url    TEXT,
        bio           TEXT,
        location      TEXT,
        profile_url   TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (provider, provider_id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at  TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS oauth_states (
        state       TEXT PRIMARY KEY,
        provider    TEXT NOT NULL,
        next_path   TEXT NOT NULL DEFAULT '/',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },
  {
    // Comptes par e-mail et mot de passe, préférences de l'onboarding (gardées côté serveur, suivent l'utilisateur)
    id: 2,
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email)) WHERE provider = 'email';

      CREATE TABLE IF NOT EXISTS newsletter (
        email       TEXT PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },
]

let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (db) return db
  db = await connect()
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
  const done = new Set((await db.query<{ id: number }>('SELECT id FROM schema_migrations')).map((r) => r.id))
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue
    await db.exec(m.sql)
    await db.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id])
  }
  return db
}
