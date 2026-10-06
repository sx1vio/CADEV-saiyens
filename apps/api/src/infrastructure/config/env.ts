import { resolve } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

// Seul endroit du code qui lit process.env (docs/architecture/02-backend.md).
// Les variables s'ajoutent ici au fur et à mesure que les modules en ont besoin.
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PROCESS_ROLE: z.enum(['http', 'worker']).default('http'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_URL: z.url(),
    DATABASE_URL: z.url(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    AUTH_FAKE_PROVIDER: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .refine((env) => !(env.NODE_ENV === 'production' && env.AUTH_FAKE_PROVIDER), {
    message: 'AUTH_FAKE_PROVIDER est interdit en production',
    path: ['AUTH_FAKE_PROVIDER'],
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
