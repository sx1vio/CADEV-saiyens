import type { XpKind } from '@devhub/core';
import type { PlannedEvent, XpSourceType } from './award-plan';

export interface StoredXpEvent {
  id: string;
  userId: string;
  kind: XpKind | 'revert';
  points: number;
  tagId: string | null;
  sourceType: string;
  sourceId: string;
  counterpartId: string | null;
  revertsId: string | null;
  revertedAt: Date | null;
  createdAt: Date;
}

/** Journal append-only des Proof XP, utilisé à l'intérieur d'une transaction. */
export interface XpLedger {
  /** Sérialise les attributions d'un utilisateur (plafond quotidien exact en concurrence). */
  lockUser(userId: string): Promise<void>;
  /** Points des kinds plafonnés gagnés depuis `since` (annulations non déduites). */
  cappedPointsSince(userId: string, since: Date): Promise<number>;
  hasGain(
    userId: string,
    kind: XpKind,
    sourceType: XpSourceType,
    sourceId: string,
    counterpartId?: string | null,
  ): Promise<boolean>;
  /** Nombre de sources distinctes ayant rapporté `kind` grâce à `counterpartId` depuis `since`. */
  countSourcesWithCounterpart(
    userId: string,
    kind: XpKind,
    counterpartId: string,
    since: Date,
  ): Promise<number>;
  /** Nombre de contreparties distinctes ayant rapporté `kind` sur une source. */
  countCounterparts(
    userId: string,
    kind: XpKind,
    sourceType: XpSourceType,
    sourceId: string,
  ): Promise<number>;
  insert(events: PlannedEvent[], at: Date): Promise<StoredXpEvent[]>;
  insertRevert(original: StoredXpEvent, reason: string, at: Date): Promise<StoredXpEvent>;
  find(eventId: string): Promise<StoredXpEvent | null>;
  markReverted(eventId: string, at: Date): Promise<void>;
  /** Répercute des points sur user_skills (xp_tag puis score). */
  applyToSkill(userId: string, tagId: string, delta: number): Promise<void>;
}

/**
 * Exécute un travail sur le journal dans une transaction. Si l'appelant en fournit une (`tx`),
 * on s'y joint : l'attribution d'XP est alors atomique avec l'action métier (validation, clôture…).
 */
export interface LedgerUnitOfWork {
  run<T>(work: (ledger: XpLedger) => Promise<T>, tx?: unknown): Promise<T>;
}
