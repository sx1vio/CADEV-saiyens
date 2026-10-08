// PR11 : signaux de confiance affichés sous le nom (Passport, /me). Tous dérivés de données
// vérifiables : aucun n'est déclaré par l'utilisateur.

/** « Membre fondateur » : inscrit avant le 22 octobre 2026 (gel du code), hors comptes de démonstration. */
export const FOUNDER_DEADLINE = new Date('2026-10-22T00:00:00Z');

export interface TrustSource {
  githubId: bigint | null;
  githubCreatedAt: Date | null;
  emailVerified: boolean;
  isDemo: boolean;
  createdAt: Date;
}

export interface TrustSignals {
  githubLinked: boolean;
  /** Âge du compte GitHub en années révolues ; null si inconnu. */
  githubAccountYears: number | null;
  emailVerified: boolean;
  demo: boolean;
  founder: boolean;
}

export function trustSignals(user: TrustSource, now: Date): TrustSignals {
  return {
    githubLinked: user.githubId !== null,
    githubAccountYears: user.githubCreatedAt ? fullYearsBetween(user.githubCreatedAt, now) : null,
    emailVerified: user.emailVerified,
    demo: user.isDemo,
    founder: !user.isDemo && user.createdAt < FOUNDER_DEADLINE,
  };
}

function fullYearsBetween(from: Date, to: Date): number {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const anniversary = Date.UTC(to.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  if (to.getTime() < anniversary) years--;
  return Math.max(0, years);
}
