import type { ReportStatus, ReportTargetType } from './moderation';

export interface ReportState {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: Date;
}

export interface TargetState {
  /** Sujet temps réel des pages qui l'affichent (« question:<id> », « room:<id> »). */
  topic: string | null;
  hidden: boolean;
  /** Message privé : seuls les membres de la conversation peuvent le signaler. */
  members?: string[];
}

export interface ModerationWriter {
  findTarget(type: ReportTargetType, id: string): Promise<TargetState | null>;
  /** Un signalement par personne et par contenu (contrainte unique) : renvoie l'existant. */
  createReport(input: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
  }): Promise<{ report: ReportState; created: boolean }>;
  /** SELECT … FOR UPDATE : deux administrateurs ne traitent pas le même signalement en même temps. */
  lockReport(id: string): Promise<ReportState | null>;
  setHidden(type: ReportTargetType, id: string, hiddenAt: Date | null): Promise<void>;
  /** Clôt le signalement (et, si demandé, les autres signalements ouverts sur le même contenu). */
  closeReports(
    report: ReportState,
    status: Exclude<ReportStatus, 'open'>,
    adminId: string,
    at: Date,
    includeOthersOnTarget: boolean,
  ): Promise<number>;
  audit(entry: {
    adminId: string;
    action: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
  }): Promise<void>;
  /** Gains de Proof XP non annulés issus de ce contenu. */
  xpGainsFrom(sourceType: string, sourceId: string): Promise<string[]>;
  publishHidden(topic: string, targetType: ReportTargetType, targetId: string): Promise<void>;
}

export interface XpRevertPort {
  revert(eventId: string, reason: string, tx?: unknown): Promise<unknown>;
}
