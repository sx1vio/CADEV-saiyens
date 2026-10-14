// Score de compétence (CDC v3 §6.3, correctif v3.1 X3) : docs/architecture/08-algorithmes.md § 3.
// Partagé par l'API et le front (page /regles, barre G + P du Passport).

export const SCORING = {
  /** G = min(40, 5 × dépôts qualifiés) */
  githubPerRepo: 5,
  githubCap: 40,
  /** P = min(60, Proof XP gagnés sur l'étiquette) */
  platformCap: 60,
  /** X3 : un dépôt compte s'il a été poussé il y a moins de 24 mois… */
  activeMonths: 24,
  /** … et si la technologie représente au moins 20 % de son code. */
  minLanguageShare: 0.2,
  /** Nombre minimal de compétences à proposer après la première connexion (PR1). */
  minProposals: 3,
  maxProposals: 10,
} as const;

export type SkillLevel = 'beginner' | 'confirmed' | 'advanced' | 'expert';

export function githubSignal(qualifiedRepos: number): number {
  return Math.min(SCORING.githubCap, SCORING.githubPerRepo * qualifiedRepos);
}

export function skillScore(githubSignalValue: number, xpTag: number): number {
  return Math.min(100, githubSignalValue + Math.min(SCORING.platformCap, Math.max(0, xpTag)));
}

export function skillLevel(score: number): SkillLevel {
  if (score >= 80) return 'expert';
  if (score >= 60) return 'advanced';
  if (score >= 30) return 'confirmed';
  return 'beginner';
}
