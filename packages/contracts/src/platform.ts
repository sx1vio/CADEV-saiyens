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
  computedAt: z.iso.datetime(),
});
export type ImpactResponse = z.infer<typeof ImpactResponse>;
