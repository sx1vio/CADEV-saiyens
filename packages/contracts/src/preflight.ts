import { z } from 'zod';

// Pré-vol : vérifier une application en ligne et son dépôt avant de la lancer
// (« du prompt à la prod vérifiée »). Le rapport est lisible par un humain et par l'IA du dev.

export const PreflightStatus = z.enum(['pass', 'warn', 'fail', 'info']);
export type PreflightStatus = z.infer<typeof PreflightStatus>;

export const PreflightCategory = z.enum([
  'security',
  'network',
  'dependencies',
  'licences',
  'hosting',
]);
export type PreflightCategory = z.infer<typeof PreflightCategory>;

/** ready : rien à corriger ; review : des avertissements ; fix : au moins un point bloquant. */
export const PreflightVerdict = z.enum(['ready', 'review', 'fix']);
export type PreflightVerdict = z.infer<typeof PreflightVerdict>;

export const PREFLIGHT_REPO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;

/** POST /api/v1/preflight : une URL publique en HTTPS, un dépôt GitHub public, ou les deux. */
export const CreatePreflightRequest = z
  .object({
    url: z
      .url({ protocol: /^https$/ })
      .max(300)
      .nullish(),
    /** « owner/repo » ou l'adresse https://github.com/owner/repo. */
    repo: z
      .string()
      .trim()
      .max(160)
      .transform((v) =>
        v
          .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
          .replace(/\.git$/i, '')
          .replace(/\/+$/, ''),
      )
      .pipe(z.string().regex(PREFLIGHT_REPO))
      .nullish(),
  })
  .refine((v) => Boolean(v.url || v.repo), {
    message: 'url or repo is required',
    path: ['url'],
  });
export type CreatePreflightRequest = z.infer<typeof CreatePreflightRequest>;

export const PreflightCheck = z.object({
  /** Identifiant stable (ex. « site.exposed_files ») : l'IA du dev peut s'y référer. */
  id: z.string(),
  category: PreflightCategory,
  status: PreflightStatus,
  title: z.string(),
  detail: z.string(),
  /** Correction proposée, formulée pour être appliquée telle quelle par un agent. */
  fix: z.string().nullable(),
  evidence: z.array(z.string()),
});
export type PreflightCheck = z.infer<typeof PreflightCheck>;

export const PreflightMetrics = z.object({
  finalUrl: z.string(),
  status: z.number().int(),
  ttfbMs: z.number().int(),
  requests: z.number().int(),
  totalBytes: z.number().int(),
  criticalBytes: z.number().int(),
  /** Estimation du premier affichage sur le profil « 3G rapide » de Chrome (1,6 Mbit/s, 562 ms). */
  estimated3gMs: z.number().int(),
  hostIps: z.array(z.string()),
  hostedOnSystalink: z.boolean(),
});
export type PreflightMetrics = z.infer<typeof PreflightMetrics>;

export const PreflightRepoSummary = z.object({
  fullName: z.string(),
  defaultBranch: z.string(),
  licence: z.string().nullable(),
  ecosystems: z.array(z.string()),
  dependencies: z.number().int(),
  vulnerablePackages: z.number().int(),
});
export type PreflightRepoSummary = z.infer<typeof PreflightRepoSummary>;

export const PreflightReport = z.object({
  id: z.uuid(),
  url: z.string().nullable(),
  repo: z.string().nullable(),
  createdAt: z.iso.datetime(),
  durationMs: z.number().int(),
  score: z.number().int().min(0).max(100),
  verdict: PreflightVerdict,
  counts: z.object({
    pass: z.number().int(),
    warn: z.number().int(),
    fail: z.number().int(),
    info: z.number().int(),
  }),
  metrics: PreflightMetrics.nullable(),
  repoSummary: PreflightRepoSummary.nullable(),
  checks: z.array(PreflightCheck),
  author: z.object({ handle: z.string(), displayName: z.string() }),
});
export type PreflightReport = z.infer<typeof PreflightReport>;

export const PreflightListItem = PreflightReport.pick({
  id: true,
  url: true,
  repo: true,
  createdAt: true,
  score: true,
  verdict: true,
  counts: true,
});
export type PreflightListItem = z.infer<typeof PreflightListItem>;

export const ListPreflightResponse = z.object({ items: z.array(PreflightListItem) });
export type ListPreflightResponse = z.infer<typeof ListPreflightResponse>;

/** Nombre de pré-vols par personne et par heure (chaque pré-vol appelle des services tiers). */
export const PREFLIGHT_HOURLY_QUOTA = 10;
