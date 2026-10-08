import type { GithubApi, GithubRepo, RepoLanguages } from '../domain/ports';

// Faux client GitHub, associé au faux fournisseur OAuth (AUTH_FAKE_PROVIDER, interdit en production).
// Profil déterministe qui exerce toutes les règles de X3 : dépôt récent, ancien, forké et vide.
export class FakeGithubClient implements GithubApi {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async listOwnedRepos(token: string): Promise<GithubRepo[]> {
    const owner = token.replace(/^fake-token-/, '');
    const monthsAgo = (m: number) => new Date(this.now().getTime() - m * 30 * 24 * 3600 * 1000);
    return [
      {
        fullName: `${owner}/devhub-web`,
        fork: false,
        sizeKb: 2400,
        pushedAt: monthsAgo(0),
        topics: ['react'],
      },
      {
        fullName: `${owner}/paylink-api`,
        fork: false,
        sizeKb: 900,
        pushedAt: monthsAgo(2),
        topics: ['docker'],
      },
      {
        fullName: `${owner}/old-portfolio`,
        fork: false,
        sizeKb: 300,
        pushedAt: monthsAgo(36),
        topics: [],
      },
      {
        fullName: `${owner}/forked-lib`,
        fork: true,
        sizeKb: 5000,
        pushedAt: monthsAgo(1),
        topics: [],
      },
      { fullName: `${owner}/empty`, fork: false, sizeKb: 0, pushedAt: monthsAgo(1), topics: [] },
    ];
  }

  async repoLanguages(_token: string, fullName: string): Promise<RepoLanguages> {
    const languages: Record<string, RepoLanguages> = {
      'devhub-web': { TypeScript: 70_000, CSS: 20_000, HTML: 10_000 },
      'paylink-api': { Python: 90_000, Dockerfile: 10_000 },
      'old-portfolio': { JavaScript: 50_000 },
      'forked-lib': { Go: 100_000 },
    };
    return languages[fullName.split('/')[1] ?? ''] ?? {};
  }
}
