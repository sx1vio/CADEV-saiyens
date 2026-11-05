import { z } from 'zod';

// Pré-vol : vérifier une application en ligne et son dépôt avant de la lancer
// (« du prompt à la prod vérifiée »). Le rapport est lisible par un humain et par l'IA du dev.

export const PreflightStatus = z.enum(['pass', 'warn', 'fail', 'info']);
export type PreflightStatus = z.infer<typeof PreflightStatus>;

export const PreflightCategory = z.enum([
  'security',
  'network',
  'performance',
  'accessibility',
  'load',
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
    /**
     * Test de charge du site (montée progressive jusqu'au point de rupture). Exige la preuve que
     * l'auteur contrôle le domaine (fichier .well-known ou enregistrement DNS) : sans elle,
     * l'outil pourrait servir à attaquer le site de quelqu'un d'autre.
     */
    loadTest: z.boolean().optional(),
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

/** Audit Lighthouse réel (mobile), exécuté par l'API PageSpeed Insights de Google. */
export const PreflightLighthouse = z.object({
  strategy: z.literal('mobile'),
  /** Scores sur 100 des quatre catégories Lighthouse. */
  scores: z.object({
    performance: z.number().int().nullable(),
    accessibility: z.number().int().nullable(),
    bestPractices: z.number().int().nullable(),
    seo: z.number().int().nullable(),
  }),
  /** Mesures de laboratoire (téléphone milieu de gamme, réseau 4G lente simulée). */
  lab: z.object({
    fcpMs: z.number().int().nullable(),
    lcpMs: z.number().int().nullable(),
    tbtMs: z.number().int().nullable(),
    cls: z.number().nullable(),
    speedIndexMs: z.number().int().nullable(),
  }),
  /** Mesures de vrais visiteurs Chrome (CrUX), quand le site a assez de trafic. */
  field: z
    .object({
      lcpMs: z.number().int().nullable(),
      inpMs: z.number().int().nullable(),
      cls: z.number().nullable(),
      overall: z.string().nullable(),
    })
    .nullable(),
  /** Pistes de gain classées (titre Lighthouse, gain estimé). */
  opportunities: z.array(
    z.object({ id: z.string(), title: z.string(), savingsMs: z.number().int() }),
  ),
  /** Audits d'accessibilité en échec (identifiant, titre, éléments touchés). */
  accessibilityIssues: z.array(
    z.object({ id: z.string(), title: z.string(), items: z.number().int() }),
  ),
});
export type PreflightLighthouse = z.infer<typeof PreflightLighthouse>;

/** Un palier du test de charge : N visiteurs simultanés pendant quelques secondes. */
export const PreflightLoadStage = z.object({
  concurrency: z.number().int(),
  requests: z.number().int(),
  rps: z.number(),
  p50Ms: z.number().int(),
  p95Ms: z.number().int(),
  p99Ms: z.number().int(),
  errors: z.number().int(),
  /** Codes reçus : { "200": 812, "503": 4, "timeout": 2 } */
  codes: z.record(z.string(), z.number().int()),
});
export type PreflightLoadStage = z.infer<typeof PreflightLoadStage>;

export const PreflightLoadTest = z.object({
  url: z.string(),
  /** Comment la propriété a été prouvée. */
  proof: z.enum(['well-known', 'dns']),
  durationMs: z.number().int(),
  totalRequests: z.number().int(),
  stages: z.array(PreflightLoadStage),
  /** Plus grand palier tenu (p95 < 2 s et moins de 2 % d'erreurs). */
  maxStableConcurrency: z.number().int(),
  /** Palier où le site a cédé, ou null s'il a tout tenu. */
  breakingConcurrency: z.number().int().nullable(),
  /** Le test s'est arrêté au plafond du pré-vol sans rupture. */
  reachedCeiling: z.boolean(),
});
export type PreflightLoadTest = z.infer<typeof PreflightLoadTest>;

/** GET /api/v1/preflight/ownership?url= : comment prouver que l'on contrôle un domaine. */
export const PreflightOwnership = z.object({
  host: z.string(),
  token: z.string(),
  fileUrl: z.string(),
  fileContent: z.string(),
  dnsName: z.string(),
  dnsValue: z.string(),
  verified: z.boolean(),
});
export type PreflightOwnership = z.infer<typeof PreflightOwnership>;

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
  lighthouse: PreflightLighthouse.nullable(),
  loadTest: PreflightLoadTest.nullable(),
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

/** Tests de charge par personne et par heure (le serveur n'en fait tourner qu'un à la fois). */
export const PREFLIGHT_LOAD_HOURLY_QUOTA = 3;

/** Plafonds du test de charge : courts et bornés, pour que l'hébergement reste quasi gratuit. */
export const PREFLIGHT_LOAD_LIMITS = {
  stages: [2, 5, 10, 20, 35, 50],
  stageMs: 4_000,
  maxRequests: 4_000,
  requestTimeoutMs: 10_000,
  /** Octets lus par réponse : la latence compte, pas le téléchargement complet. */
  maxBytesPerResponse: 64 * 1024,
} as const;
