import type { MatchCandidate, Regime, ScoredHelper } from '@devhub/core';

// Ports du module matching (docs/architecture/08-algorithmes.md § 1).

export interface MatchingQuestion {
  id: string;
  title: string;
  authorId: string;
  authorIsDemo: boolean;
  authorTimezone: string | null;
  status: 'open' | 'resolved' | 'closed';
  lang: 'fr' | 'en';
  tags: Array<{ id: string; label: string }>;
  /** Réponses visibles, toutes personnes confondues. */
  answerCount: number;
  /** « Je m'en occupe » encore actif (S11). */
  activeClaim: boolean;
  /** Vagues déjà envoyées : un job rejoué ne relance jamais la même vague. */
  wavesDone: number[];
}

export interface NewMatchEvent {
  questionId: string;
  helperId: string;
  wave: number;
  rank: number;
  score: number;
  regime: Regime;
  reasons: Array<{ code: string; params: Record<string, unknown> }>;
}

export interface MatchingStore {
  findQuestion(questionId: string, claimSince: Date): Promise<MatchingQuestion | null>;
  /** Réponses validées sur toute la plateforme (régime X4). */
  acceptedAnswersOnPlatform(): Promise<number>;
  /** Présélection SQL puis détails, au plus 200 candidats (08 § 1). */
  candidates(question: MatchingQuestion, activeSince: Date, now: Date): Promise<MatchCandidate[]>;
  /** Écrit les sollicitations et notifie les aidants, dans une même transaction. */
  recordWave(events: NewMatchEvent[], notify: (tx: unknown) => Promise<void>): Promise<void>;
  markEscalated(questionId: string, at: Date): Promise<void>;
}

export interface MatchNotifier {
  notify(
    notifications: Array<{
      userId: string;
      type: 'match.request';
      payload: Record<string, unknown>;
    }>,
    tx?: unknown,
  ): Promise<void>;
}

export type WaveOutcome =
  | { kind: 'matched'; helpers: ScoredHelper[]; regime: Regime }
  /** Moins de 3 éligibles : la question est ouverte à toute la stack (08 § 1, sélection 3). */
  | { kind: 'open_to_stack'; helpers: ScoredHelper[]; regime: Regime }
  | { kind: 'skipped'; reason: 'not_found' | 'not_open' | 'answered' | 'claimed' | 'already_sent' };
