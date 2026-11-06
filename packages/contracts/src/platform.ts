import { z } from 'zod';

// Écran Systalink (Y1) et écran d'impact (Y2). Valeurs mesurées, jamais codées en dur.

export const SystalinkService = z.enum(['vps', 'database', 'backup', 'mail']);
export type SystalinkService = z.infer<typeof SystalinkService>;

/**
 * operational : la dernière sonde a réussi ; down : elle a échoué ; not_configured : le service
 * n'est pas encore branché (ex. SMTP vide) ; unknown : aucune sonde récente (plus de 15 min).
 */
export const ServiceState = z.enum(['operational', 'down', 'not_configured', 'unknown']);
export type ServiceState = z.infer<typeof ServiceState>;

export const ServiceStatus = z.object({
  service: SystalinkService,
  state: ServiceState,
  latencyMs: z.number().int().nullable(),
  checkedAt: z.iso.datetime().nullable(),
});
export type ServiceStatus = z.infer<typeof ServiceStatus>;

/** GET /api/v1/status */
export const StatusResponse = z.object({
  overall: z.enum(['operational', 'degraded', 'unknown']),
  services: z.array(ServiceStatus),
  /** Dernière sauvegarde réussie, lue dans le fichier d'état écrit par backup.sh. */
  lastBackupAt: z.iso.datetime().nullable(),
});
export type StatusResponse = z.infer<typeof StatusResponse>;

/** GET /api/v1/impact : chiffres publics, comptes de démonstration exclus. */
export const ImpactResponse = z.object({
  registeredDevs: z.number().int(),
  questionsAsked: z.number().int(),
  questionsResolved: z.number().int(),
  /** Médiane du délai entre une question et la première réponse d'une autre personne. */
  medianFirstResponseMinutes: z.number().int().nullable(),
  countries: z.number().int(),
  projectRooms: z.number().int(),
  /** Tâches terminées avec une PR « Vérifiée par GitHub » (R9), salles publiques. */
  verifiedContributions: z.number().int(),
  /** Réponses validées écrites par un dev qui ne parle pas la langue de la question (S10, Y9). */
  crossLanguageAnswers: z.number().int(),
  computedAt: z.iso.datetime(),
});
export type ImpactResponse = z.infer<typeof ImpactResponse>;

/** GET /api/v1/status/history?days=7 (Y5) : disponibilité par service et par jour (UTC). */
export const StatusHistoryQuery = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
});
export type StatusHistoryQuery = z.infer<typeof StatusHistoryQuery>;

/** Part des sondes réussies (0 à 100, une décimale) ; null sans sonde utile ce jour-là. */
const Uptime = z.number().min(0).max(100).nullable();

export const StatusHistoryResponse = z.object({
  days: z.number().int(),
  services: z.array(
    z.object({
      service: SystalinkService,
      uptimePercent: Uptime,
      checks: z.number().int(),
      daily: z.array(
        z.object({ date: z.iso.date(), uptimePercent: Uptime, checks: z.number().int() }),
      ),
    }),
  ),
});
export type StatusHistoryResponse = z.infer<typeof StatusHistoryResponse>;

// ─────────────── Écosystème Systalink (idées A et B) ───────────────

/** Destinations du bouton « Déployer sur Systalink » (liste fermée côté serveur). */
export const SystalinkTarget = z.enum(['deploy', 'orion', 'server', 'console']);
export type SystalinkTarget = z.infer<typeof SystalinkTarget>;
/** Écran d'où part le renvoi : mesure de ce que DevHub apporte à Systalink. */
export const SystalinkSource = z.enum([
  'room',
  'templates',
  'build',
  'systalink',
  'help',
  'preflight',
  'bench',
]);
export type SystalinkSource = z.infer<typeof SystalinkSource>;

/** GET /api/v1/go/systalink : compte le renvoi, puis redirige (302) vers Systalink. */
export const GoSystalinkQuery = z.object({
  to: SystalinkTarget.default('deploy'),
  from: SystalinkSource.default('systalink'),
  /** Code de la salle d'où part le renvoi : son dépôt GitHub accompagne le lien. */
  room: z
    .string()
    .regex(/^[a-z0-9]{4,16}$/)
    .optional(),
});
export type GoSystalinkQuery = z.infer<typeof GoSystalinkQuery>;

/** GET /api/v1/systalink/ecosystem : ce que la communauté apporte à Systalink, public. */
export const SystalinkEcosystemResponse = z.object({
  referrals: z.object({
    total: z.number().int(),
    last30Days: z.number().int(),
    bySource: z.array(z.object({ source: SystalinkSource, count: z.number().int() })),
  }),
  /** Salles publiques dont l'application est vérifiée en production sur Systalink. */
  roomsOnSystalink: z.number().int(),
  /** Les plus récentes, pour la vitrine de l'écran /systalink. */
  showcase: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      url: z.string(),
      uptime: z.number().min(0).max(1).nullable(),
      verifiedAt: z.iso.datetime(),
    }),
  ),
  computedAt: z.iso.datetime(),
});
export type SystalinkEcosystemResponse = z.infer<typeof SystalinkEcosystemResponse>;
