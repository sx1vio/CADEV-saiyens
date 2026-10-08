import { SCORING, githubSignal } from './skill-score';

export interface RepoForScoring {
  fork: boolean;
  sizeKb: number;
  pushedAt: Date | null;
  /** Octets par langage GitHub (« TypeScript », « Dockerfile »…). */
  languages: Record<string, number>;
}

export interface TagSignal {
  tagId: string;
  /** Dépôts qualifiés au sens de X3 pour cette technologie. */
  qualifiedRepos: number;
  /** G = min(40, 5 × qualifiedRepos). */
  githubSignal: number;
  /** Octets de code de cette technologie dans les dépôts personnels non vides (ordre des propositions). */
  bytes: number;
}

/**
 * Calcule les signaux GitHub par étiquette et choisit les compétences à proposer (PR1).
 * - Seuls les dépôts personnels (non forkés) et non vides sont lus.
 * - Un dépôt est « qualifié » pour une technologie s'il a été poussé depuis moins de 24 mois
 *   et si la technologie y pèse au moins 20 % du code (X3 : 8 dépôts vides ne valent plus 40 points).
 * - Les étiquettes qualifiées sont toujours proposées ; si elles sont moins de 3, on complète avec
 *   les technologies les plus présentes, sans points GitHub (G = 0) : proposées, pas prouvées.
 */
export function computeGithubSignals(
  repos: RepoForScoring[],
  tagIdForLanguage: (language: string) => string | undefined,
  now: Date,
): TagSignal[] {
  const activeSince = new Date(now);
  activeSince.setUTCMonth(activeSince.getUTCMonth() - SCORING.activeMonths);

  const byTag = new Map<string, { qualifiedRepos: number; bytes: number }>();
  for (const repo of repos) {
    if (repo.fork || repo.sizeKb <= 0) continue;
    const total = Object.values(repo.languages).reduce((sum, n) => sum + n, 0);
    if (total <= 0) continue;
    const active = repo.pushedAt !== null && repo.pushedAt >= activeSince;

    // Plusieurs langages peuvent pointer vers la même étiquette : un dépôt ne compte qu'une fois par étiquette.
    const shareByTag = new Map<string, number>();
    for (const [language, bytes] of Object.entries(repo.languages)) {
      const tagId = tagIdForLanguage(language);
      if (tagId) shareByTag.set(tagId, (shareByTag.get(tagId) ?? 0) + bytes);
    }
    for (const [tagId, bytes] of shareByTag) {
      const entry = byTag.get(tagId) ?? { qualifiedRepos: 0, bytes: 0 };
      entry.bytes += bytes;
      if (active && bytes / total >= SCORING.minLanguageShare) entry.qualifiedRepos++;
      byTag.set(tagId, entry);
    }
  }

  const ranked = [...byTag.entries()]
    .map(([tagId, e]) => ({
      tagId,
      qualifiedRepos: e.qualifiedRepos,
      githubSignal: githubSignal(e.qualifiedRepos),
      bytes: e.bytes,
    }))
    .sort(
      (a, b) =>
        b.qualifiedRepos - a.qualifiedRepos || b.bytes - a.bytes || a.tagId.localeCompare(b.tagId),
    );

  const qualified = ranked.filter((s) => s.qualifiedRepos > 0);
  const count = Math.min(SCORING.maxProposals, Math.max(qualified.length, SCORING.minProposals));
  return ranked.slice(0, count);
}
