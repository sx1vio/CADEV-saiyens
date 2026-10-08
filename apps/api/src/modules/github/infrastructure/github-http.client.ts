import type { GithubApi, GithubRepo, RepoLanguages } from '../domain/ports';

const API = 'https://api.github.com';
const TIMEOUT_MS = 10_000;
const MAX_PAGES = 3; // 300 dépôts au plus : largement assez pour un profil

export class GithubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
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
        `/user/repos?type=owner&visibility=public&sort=pushed&direction=desc&per_page=100&page=${page}`,
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
      throw new GithubApiError(
        `GitHub a répondu ${response.status} sur ${path.split('?')[0]}`,
        response.status,
      );
    }
    return (await response.json()) as T;
  }
}
