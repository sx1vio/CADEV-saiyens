// Ce que la connexion GitHub nous apprend d'un développeur (A1, PR1, PR11).
export interface GithubIdentity {
  githubId: bigint;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  /** Date de création du compte GitHub : signal de confiance affiché sur le Passport (PR11). */
  createdAt: Date;
  /** E-mail principal vérifié ; null si GitHub n'en fournit aucun de vérifié. */
  email: string | null;
  accessToken: string;
  scopes: string[];
}

/** Scopes demandés à GitHub : lecture seule, e-mail inclus (correctif v3.1, point d'attention n° 8). */
export const GITHUB_SCOPES = ['read:user', 'user:email'] as const;
