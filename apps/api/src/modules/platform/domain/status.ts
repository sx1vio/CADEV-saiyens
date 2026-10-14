import type { ServiceState, StatusResponse, SystalinkService } from '@devhub/contracts';

// Y1 : état des services Systalink, déduit des dernières sondes (job status.check).

export const SERVICES: readonly SystalinkService[] = ['vps', 'database', 'backup', 'mail'];
/** Sondes toutes les 5 min : au-delà de 15 min sans résultat, l'état est inconnu. */
export const STALE_AFTER_MS = 15 * 60 * 1000;
/** Sauvegarde quotidienne à 02:30 UTC : on tolère deux heures de retard. */
export const BACKUP_MAX_AGE_MS = 26 * 60 * 60 * 1000;

export interface ProbeResult {
  service: SystalinkService;
  ok: boolean;
  latencyMs: number | null;
  /** configured: false si le service n'est pas encore branché ; lastBackupAt pour la sauvegarde. */
  detail: { configured?: boolean; lastBackupAt?: string; error?: string } | null;
}

export interface StoredCheck extends ProbeResult {
  checkedAt: Date;
}

export function stateOf(check: StoredCheck | undefined, now: Date): ServiceState {
  if (!check || now.getTime() - check.checkedAt.getTime() > STALE_AFTER_MS) return 'unknown';
  if (check.detail?.configured === false) return 'not_configured';
  return check.ok ? 'operational' : 'down';
}

/** La dernière sauvegarde réussie date de moins de 26 h (une date dans le futur est rejetée). */
export function backupIsFresh(lastBackupAt: string | undefined, now: Date): boolean {
  const at = lastBackupAt ? Date.parse(lastBackupAt) : Number.NaN;
  if (Number.isNaN(at)) return false;
  const age = now.getTime() - at;
  return age >= -5 * 60 * 1000 && age <= BACKUP_MAX_AGE_MS;
}

/** Dernière sonde de chaque service (une par service au plus) → réponse de GET /status. */
export function summarize(latest: StoredCheck[], now: Date): StatusResponse {
  const byService = new Map(latest.map((c) => [c.service, c]));
  const services = SERVICES.map((service) => {
    const check = byService.get(service);
    return {
      service,
      state: stateOf(check, now),
      latencyMs: check?.latencyMs ?? null,
      checkedAt: check?.checkedAt.toISOString() ?? null,
    };
  });
  const states = services.map((s) => s.state);
  const overall = states.includes('down')
    ? 'degraded'
    : states.includes('unknown')
      ? 'unknown'
      : 'operational';
  const lastBackupAt = byService.get('backup')?.detail?.lastBackupAt;
  return {
    overall,
    services,
    lastBackupAt:
      lastBackupAt && !Number.isNaN(Date.parse(lastBackupAt))
        ? new Date(lastBackupAt).toISOString()
        : null,
  };
}
