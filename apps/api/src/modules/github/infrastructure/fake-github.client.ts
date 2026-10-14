import { createHash } from 'node:crypto';
import type {
  GithubApi,
  GithubIssue,
  GithubPull,
  GithubRepo,
  GithubRepoInfo,
  RepoLanguages,
} from '../domain/ports';

/** Même dérivation que le faux fournisseur OAuth : identifiant GitHub stable d'un login. */
export function fakeGithubId(login: string): bigint {
  return (
    9_000_000_000_000n +
    BigInt(`0x${createHash('sha256').update(login).digest('hex').slice(0, 10)}`)
  );
}

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

  /**
   * Dépôts : tout « owner/nom » existe et est public, sauf un nom qui commence par « missing »
   * (introuvable) ou par « private » (privé). Seul « owner » peut y pousser.
   */
  async getRepo(token: string, fullName: string): Promise<GithubRepoInfo | null> {
    const [owner = '', name = ''] = fullName.split('/');
    if (name.startsWith('missing')) return null;
    return {
      fullName,
      private: name.startsWith('private'),
      archived: false,
      description: 'Dépôt de démonstration',
      htmlUrl: `https://github.com/${fullName}`,
      // L'utilisateur du faux jeton peut pousser sur les dépôts de son propre compte.
      canPush: owner.toLowerCase() === token.replace(/^fake-token-/, '').toLowerCase(),
    };
  }

  /** PR n° N : fusionnée si N est pair, auteur « pr-author-N » (identifiant dérivé comme ci-dessus). */
  async getPullRequest(
    _token: string,
    _fullName: string,
    number: number,
  ): Promise<GithubPull | null> {
    if (number >= 900_000) return null;
    const login = `pr-author-${number}`;
    return { number, merged: number % 2 === 0, authorId: fakeGithubId(login), authorLogin: login };
  }

  async listOpenIssues(_token: string, fullName: string): Promise<GithubIssue[]> {
    const base = Number(
      BigInt(`0x${createHash('sha256').update(fullName).digest('hex').slice(0, 8)}`),
    );
    return [
      { number: 1, title: 'Ajouter le mode sombre', labels: ['good first issue'] },
      { number: 2, title: 'Corriger le timeout de connexion', labels: ['bug'] },
      { number: 3, title: 'Documenter le déploiement', labels: ['documentation'] },
    ].map((i) => ({ ...i, id: BigInt(base + i.number), body: null }));
  }
}
