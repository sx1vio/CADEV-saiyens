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

/** Dépôt lié à une salle (R1). */
export interface GithubRepoInfo {
  fullName: string;
  private: boolean;
  archived: boolean;
  description: string | null;
  htmlUrl: string;
}

/** Pull request d'une contribution (R9). */
export interface GithubPull {
  number: number;
  merged: boolean;
  /** Identifiant GitHub de l'auteur de la PR. */
  authorId: bigint | null;
  authorLogin: string | null;
}

/** Issue ouverte importable en tâche (R2). Les pull requests sont exclues. */
export interface GithubIssue {
  id: bigint;
  number: number;
  title: string;
  body: string | null;
  labels: string[];
}

/** « owner/repo » tel que GitHub l'accepte ; validé avant toute requête. */
export const REPO_FULL_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;

/** Lien de PR GitHub : https://github.com/owner/repo/pull/123 */
export function parsePullUrl(url: string): { fullName: string; number: number } | null {
  const m =
    /^https:\/\/github\.com\/([A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100})\/pull\/(\d{1,9})\/?$/.exec(
      url,
    );
  return m && REPO_FULL_NAME.test(m[1]!) ? { fullName: m[1]!, number: Number(m[2]) } : null;
}

export interface GithubApi {
  /** Dépôts publics dont l'utilisateur est propriétaire, du plus récemment poussé au plus ancien. */
  listOwnedRepos(token: string): Promise<GithubRepo[]>;
  repoLanguages(token: string, fullName: string): Promise<RepoLanguages>;
  /** null si le dépôt n'existe pas (ou n'est pas visible avec ce jeton). */
  getRepo(token: string, fullName: string): Promise<GithubRepoInfo | null>;
  getPullRequest(token: string, fullName: string, number: number): Promise<GithubPull | null>;
  /** Issues ouvertes (50 au plus), filtrées par étiquette si `labels` est fourni. */
  listOpenIssues(token: string, fullName: string, labels?: string[]): Promise<GithubIssue[]>;
}

export const GITHUB_API = Symbol('GITHUB_API');
