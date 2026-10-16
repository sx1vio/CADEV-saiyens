import type { SystalinkService } from '@devhub/contracts';
import type { DailyCount, ProbeResult, StoredCheck } from './status';

/** Une sonde mesure un service ; elle ne lève jamais (un échec est un résultat). */
export interface Probe {
  readonly service: SystalinkService;
  probe(): Promise<ProbeResult>;
}

export interface StatusStore {
  record(results: ProbeResult[], at: Date): Promise<void>;
  /** Rétention de 30 jours (05-modele-donnees.md). */
  purgeBefore(at: Date): Promise<number>;
  latest(): Promise<StoredCheck[]>;
  /** Sondes par service et par jour UTC depuis `since` (les « non branché » exclues). */
  dailyCounts(since: Date): Promise<DailyCount[]>;
}
