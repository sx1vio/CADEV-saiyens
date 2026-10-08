// Port de l'API GitHub (docs/architecture/09-ia-integrations.md). Lecture seule, avec le jeton
// de l'utilisateur : 5 000 requêtes par heure et par utilisateur.
export interface GithubRepo {
  fullName: string;
  fork: boolean;
  /** Taille en Ko telle que l'API la renvoie ; 0 pour un dépôt vide. */
  sizeKb: number;
  pushedAt: Date | null;
  topics: string[];
}

/** Octets de code par langage, tels que renvoyés par GET /repos/{owner}/{repo}/languages. */
export type RepoLanguages = Record<string, number>;

export interface GithubApi {
  /** Dépôts publics dont l'utilisateur est propriétaire, du plus récemment poussé au plus ancien. */
  listOwnedRepos(token: string): Promise<GithubRepo[]>;
  repoLanguages(token: string, fullName: string): Promise<RepoLanguages>;
}

export const GITHUB_API = Symbol('GITHUB_API');
