// Barème et garde-fous des Proof XP (CDC v3 §6.3) : docs/architecture/08-algorithmes.md § 2.
// Partagés par l'API (attribution) et le front (page /regles, X5).

export type XpKind =
  | 'answer_accepted'
  | 'answer_fast_bonus'
  | 'answer_helpful_vote'
  | 'task_completed'
  | 'code_review_given'
  | 'project_demo_shared'
  | 'question_resolved'
  | 'deployment_verified';

export const XP_POINTS: Record<XpKind, number> = {
  answer_accepted: 10,
  answer_fast_bonus: 3,
  answer_helpful_vote: 2,
  task_completed: 15,
  code_review_given: 8,
  project_demo_shared: 5,
  question_resolved: 1,
  /** Application d'une salle vérifiée en production sur l'infrastructure Systalink, une fois par salle. */
  deployment_verified: 10,
};

export const XP_LIMITS = {
  /** Plafond quotidien (jour UTC), bonus de vitesse non compris. */
  dailyCap: 60,
  /** Kinds qui ne comptent pas dans le plafond quotidien. */
  uncappedKinds: ['answer_fast_bonus'] as readonly XpKind[],
  /** Bonus de vitesse : réponse validée moins de 15 minutes après la question. */
  fastBonusMinutes: 15,
  /** Votes « utile » qui rapportent des XP, au plus, par réponse. */
  helpfulVotesPerAnswer: 5,
  /** Validations rémunérées, au plus, par paire auteur-répondant et par semaine glissante. */
  validationsPerPairPerWeek: 2,
  /** Un compte de moins de 24 h ne fait pas gagner d'XP par ses votes. */
  minVoterAccountAgeHours: 24,
} as const;

export function isCapped(kind: XpKind): boolean {
  return !XP_LIMITS.uncappedKinds.includes(kind);
}

/** Points encore attribuables aujourd'hui : on attribue ce qui reste sous le plafond, jamais en négatif. */
export function applyDailyCap(
  requested: number,
  alreadyToday: number,
  cap: number = XP_LIMITS.dailyCap,
): number {
  return Math.max(0, Math.min(requested, cap - Math.max(0, alreadyToday)));
}

/**
 * Répartit des points entiers entre plusieurs étiquettes, le reste allant aux premières :
 * 10 points sur 3 étiquettes donnent 4, 3, 3. Le total est toujours conservé.
 * Sans étiquette, tout va dans une part unique (événement sans étiquette).
 */
export function splitPoints(points: number, parts: number): number[] {
  if (parts <= 0) return [points];
  const base = Math.trunc(points / parts);
  const remainder = points - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** Début du jour UTC qui contient `now` (fenêtre du plafond quotidien). */
export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
