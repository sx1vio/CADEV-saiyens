import type { GithubApi, GithubRepo, RepoLanguages } from '../domain/ports';

const API = 'https://api.github.com';
const TIMEOUT_MS = 10_000;
const MAX_PAGES = 3; // 300 dépôts au plus : largement assez pour un profil

export class GithubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Fin de la fenêtre de quota si GitHub l'a épuisée (403 ou 429 avec X-RateLimit-Remaining: 0). */
    readonly rateLimitResetAt: Date | null = null,
  ) {
    super(message);
  }

  /** Jeton révoqué ou expiré : réessayer ne sert à rien, l'utilisateur doit se reconnecter. */
  get tokenRevoked(): boolean {
    return this.status === 401;
  }

  get rateLimited(): boolean {
    return this.rateLimitResetAt !== null;
  }
}

interface RawRepo {
  full_name: string;
  fork: boolean;
  size: number;
  pushed_at: string | null;
  topics?: string[];
}

export class GithubHttpClient implements GithubApi {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async listOwnedRepos(token: string): Promise<GithubRepo[]> {
    const repos: GithubRepo[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await this.get<RawRepo[]>(
        token,
        // `type` est incompatible avec `visibility` (GitHub répond 422) : on filtre par `affiliation`.
        `/user/repos?affiliation=owner&visibility=public&sort=pushed&direction=desc&per_page=100&page=${page}`,
      );
      repos.push(
        ...batch.map((r) => ({
          fullName: r.full_name,
          fork: r.fork,
          sizeKb: r.size,
          pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
          topics: r.topics ?? [],
        })),
      );
      if (batch.length < 100) break;
    }
    return repos;
  }

  repoLanguages(token: string, fullName: string): Promise<RepoLanguages> {
    return this.get<RepoLanguages>(token, `/repos/${fullName}/languages`);
  }

  private async get<T>(token: string, path: string): Promise<T> {
    const response = await this.fetchImpl(API + path, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'devhub-africa',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const exhausted =
        (response.status === 403 || response.status === 429) &&
        response.headers.get('x-ratelimit-remaining') === '0';
      const reset = Number(response.headers.get('x-ratelimit-reset'));
      throw new GithubApiError(
        `GitHub a répondu ${response.status} sur ${path.split('?')[0]}`,
        response.status,
        exhausted && reset > 0 ? new Date(reset * 1000) : null,
      );
    }
    return (await response.json()) as T;
  }
}
