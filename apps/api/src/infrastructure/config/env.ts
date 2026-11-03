import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

// Seul endroit du code qui lit process.env (docs/architecture/02-backend.md).
// Les variables s'ajoutent ici au fur et à mesure que les modules en ont besoin.
// Une variable vide dans le .env (« GITHUB_CLIENT_ID= ») est traitée comme absente.
const optional = (schema: z.ZodString) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const base64Key32 = z.string().refine((v) => Buffer.from(v, 'base64').length === 32, {
  message: 'doit être une clé de 32 octets encodée en base64 (openssl rand -base64 32)',
});

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PROCESS_ROLE: z.enum(['http', 'worker']).default('http'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_URL: z.url(),
    API_URL: z.url(),
    DATABASE_URL: z.url(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    SESSION_SECRET: z.string().min(32, 'au moins 32 caractères (openssl rand -base64 48)'),
    TOKEN_ENCRYPTION_KEY: base64Key32,
    GITHUB_CLIENT_ID: optional(z.string()),
    GITHUB_CLIENT_SECRET: optional(z.string()),
    // Cache disque du proxy d'images des actualités (module news) ; il peut être vidé à tout moment.
    NEWS_IMAGE_CACHE_DIR: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().default(join(tmpdir(), 'devhub-news-img')),
    ),
    AUTH_FAKE_PROVIDER: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    // IA (docs/architecture/09-ia-integrations.md). Sans clé : faux modèle en développement,
    // IA désactivée en production (ai_status = skipped).
    LLM_API_KEY: optional(z.string()),
    LLM_MODEL: z.string().min(1).default('claude-sonnet-5-5'),
    LLM_HOURLY_QUOTA_PER_USER: z.coerce.number().int().nonnegative().default(10),
    LLM_HINT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    LLM_TRANSLATE_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    // Sondes Systalink (Y1). Vide = service « non branché », affiché comme tel.
    // BACKUP_STATUS_URL : chemin du fichier d'état écrit par backup.sh, ou URL qui le sert.
    BACKUP_STATUS_URL: optional(z.string()),
    SMTP_HOST: optional(z.string()),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optional(z.string()),
    SMTP_PASSWORD: optional(z.string()),
    MAIL_FROM: z.string().min(3).default('DevHub Africa <notifications@devhub.africa>'),
    // Idée A : plages réseau de Systalink (CIDR IPv4, séparées par des virgules). Une application
    // dont l'adresse y tombe est « en production sur Systalink ». À confirmer avec Systalink.
    SYSTALINK_IP_RANGES: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z
        .string()
        .default('102.203.220.0/22')
        .transform((v) =>
          v
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean),
        ),
    ),
    // R7 : index.html construit du front, enrichi des balises de partage (défaut : ./web/index.html).
    WEB_INDEX_HTML: optional(z.string()),
    // Espace d'administration (apps/admin), servi sur sa propre origine. Absent : désactivé,
    // toutes les routes /api/v1/admin/* répondent 404.
    ADMIN_URL: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
    // Portail entreprise (apps/business), servi sur sa propre origine. Absent : désactivé.
    BUSINESS_URL: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
    // Plages CIDR IPv4 autorisées à ouvrir l'administration (séparées par des virgules). Vide : toutes.
    ADMIN_ALLOWED_IPS: z.preprocess(
      (v) => (v === undefined ? '' : v),
      z.string().transform((v) =>
        v
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      ),
    ),
  })
  .refine(
    (env) => !env.ADMIN_URL || new URL(env.ADMIN_URL).origin !== new URL(env.APP_URL).origin,
    {
      message: "ADMIN_URL doit être une origine distincte de l'application (sous-domaine ou port)",
      path: ['ADMIN_URL'],
    },
  )
  .refine((env) => !(env.NODE_ENV === 'production' && env.AUTH_FAKE_PROVIDER), {
    message: 'AUTH_FAKE_PROVIDER est interdit en production',
    path: ['AUTH_FAKE_PROVIDER'],
  })
  .refine((env) => env.AUTH_FAKE_PROVIDER || (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET), {
    message: 'GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET sont obligatoires sans AUTH_FAKE_PROVIDER',
    path: ['GITHUB_CLIENT_ID'],
  });

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration invalide :\n${details}`);
  }
  return result.data;
}

export function loadEnv(): Env {
  // En développement, le .env est à la racine du monorepo ; en production, Docker injecte les variables.
  config({ path: resolve(__dirname, '../../../../../.env'), quiet: true });
  return parseEnv(process.env);
}
