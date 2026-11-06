import { z } from 'zod';
import { PublicAuthor } from './questions';

// Banc d'essai : un dev demande à d'autres devs de tester son application sur de vrais appareils
// et de vrais réseaux (Android d'entrée de gamme, 3G, hors ligne…). Chaque testeur rend un
// rapport structuré ; le demandeur le confirme, ce qui rapporte des Proof XP au testeur.
// Les rapports ne sont lisibles que par le demandeur et leur auteur (ils peuvent décrire une faille).

export const BENCH_DEVICES = [
  'android_low', // Android d'entrée de gamme (≤ 3 Go de RAM)
  'android',
  'iphone',
  'tablet',
  'desktop',
] as const;
export const BenchDevice = z.enum(BENCH_DEVICES);
export type BenchDevice = z.infer<typeof BenchDevice>;

export const BENCH_NETWORKS = ['2g', '3g', '4g', 'wifi', 'offline'] as const;
export const BenchNetwork = z.enum(BENCH_NETWORKS);
export type BenchNetwork = z.infer<typeof BenchNetwork>;

export const BenchVerdict = z.enum(['works', 'issues', 'broken']);
export type BenchVerdict = z.infer<typeof BenchVerdict>;

export const BenchSeverity = z.enum(['blocking', 'major', 'minor']);
export type BenchSeverity = z.infer<typeof BenchSeverity>;

export const BenchReportStatus = z.enum(['submitted', 'confirmed', 'rejected']);
export type BenchReportStatus = z.infer<typeof BenchReportStatus>;

const HttpsUrl = z.url({ protocol: /^https$/ }).max(500);

/** POST /api/v1/bench (Idempotency-Key) */
export const CreateBenchRequest = z.object({
  title: z.string().trim().min(8).max(120),
  appUrl: HttpsUrl,
  repoUrl: HttpsUrl.nullable().default(null),
  /** Ce qu'il faut tester : parcours, comptes de test, points sensibles. */
  instructions: z.string().trim().min(20).max(4_000),
  devices: z.array(BenchDevice).min(1).max(BENCH_DEVICES.length),
  networks: z.array(BenchNetwork).min(1).max(BENCH_NETWORKS.length),
  maxTesters: z.number().int().min(1).max(20).default(5),
});
export type CreateBenchRequest = z.infer<typeof CreateBenchRequest>;

export const BenchFinding = z.object({
  severity: BenchSeverity,
  title: z.string().trim().min(3).max(160),
  /** Étapes pour reproduire, résultat attendu et obtenu. */
  details: z.string().trim().max(2_000).default(''),
});
export type BenchFinding = z.infer<typeof BenchFinding>;

/** POST /api/v1/bench/:id/reports (Idempotency-Key) */
export const CreateBenchReport = z.object({
  device: BenchDevice,
  /** Modèle réel : « Tecno Spark 10 », « iPhone 12 », « ThinkPad X220 ». */
  model: z.string().trim().min(2).max(80),
  os: z.string().trim().min(2).max(40),
  browser: z.string().trim().min(2).max(40),
  network: BenchNetwork,
  /** Code pays ISO 3166-1 alpha-2, facultatif. */
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((s) => s.toUpperCase())
    .nullable()
    .default(null),
  verdict: BenchVerdict,
  findings: z.array(BenchFinding).max(20).default([]),
  notes: z.string().trim().max(2_000).default(''),
});
export type CreateBenchReport = z.infer<typeof CreateBenchReport>;

/** POST /api/v1/bench/reports/:id/review : le demandeur juge le rapport. */
export const ReviewBenchReport = z.object({
  decision: z.enum(['confirm', 'reject']),
});
export type ReviewBenchReport = z.infer<typeof ReviewBenchReport>;

/** Une case de la couverture : appareil × réseau, avec le pire verdict reçu. */
export const BenchCoverageCell = z.object({
  device: BenchDevice,
  network: BenchNetwork,
  reports: z.number().int(),
  worst: BenchVerdict,
});

export const BenchItem = z.object({
  id: z.uuid(),
  title: z.string(),
  appUrl: z.string(),
  repoUrl: z.string().nullable(),
  devices: z.array(BenchDevice),
  networks: z.array(BenchNetwork),
  maxTesters: z.number().int(),
  /** Application servie depuis le réseau Systalink (adresse IP vérifiée à la publication). */
  hostedOnSystalink: z.boolean(),
  /** Rapports reçus, hors rapports refusés (ils libèrent la place). */
  testers: z.number().int(),
  status: z.enum(['open', 'closed']),
  author: PublicAuthor,
  mine: z.boolean(),
  /** Le visiteur a déjà rendu un rapport sur cette demande. */
  reported: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type BenchItem = z.infer<typeof BenchItem>;

/** GET /api/v1/bench */
export const ListBenchQuery = z.object({
  device: BenchDevice.optional(),
  network: BenchNetwork.optional(),
  /** « mine » : mes demandes ; « tested » : celles où j'ai rendu un rapport. */
  scope: z.enum(['open', 'mine', 'tested']).default('open'),
  /** « true » : seulement les applications hébergées chez Systalink. */
  systalink: z.stringbool().optional(),
});
export type ListBenchQuery = z.infer<typeof ListBenchQuery>;

export const ListBenchResponse = z.object({
  data: z.array(BenchItem),
  stats: z.object({
    open: z.number().int(),
    reports: z.number().int(),
    confirmed: z.number().int(),
  }),
});
export type ListBenchResponse = z.infer<typeof ListBenchResponse>;

export const BenchReportView = z.object({
  id: z.uuid(),
  tester: PublicAuthor,
  device: BenchDevice,
  model: z.string(),
  os: z.string(),
  browser: z.string(),
  network: BenchNetwork,
  country: z.string().nullable(),
  verdict: BenchVerdict,
  findings: z.array(BenchFinding),
  notes: z.string(),
  status: BenchReportStatus,
  /** Proof XP reçus par le testeur à la confirmation. */
  points: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type BenchReportView = z.infer<typeof BenchReportView>;

/** GET /api/v1/bench/:id */
export const BenchDetail = BenchItem.extend({
  instructions: z.string(),
  coverage: z.array(BenchCoverageCell),
  /** Rapports visibles par le visiteur : tous pour le demandeur, le sien pour un testeur. */
  reports: z.array(BenchReportView),
});
export type BenchDetail = z.infer<typeof BenchDetail>;

export const ReviewBenchReportResponse = z.object({
  status: BenchReportStatus,
  points: z.number().int(),
  withheld: z.array(z.object({ kind: z.string(), reason: z.string() })),
});
export type ReviewBenchReportResponse = z.infer<typeof ReviewBenchReportResponse>;
