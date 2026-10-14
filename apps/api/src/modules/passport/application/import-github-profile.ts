import type { GithubApi, GithubRepo } from '../../github';
import { computeGithubSignals } from '@devhub/core';
import type { GithubTokenSource, ImportSummary, SkillStore } from '../domain/ports';

const MAX_REPOS_ANALYSED = 30; // les plus récemment poussés (quota GitHub, §14)
const LANGUAGE_CONCURRENCY = 5;
export const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // un réimport manuel par heure au plus

export class GithubNotLinkedError extends Error {}
export class RefreshTooSoonError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Réimport trop rapproché');
  }
}

// PR1 + X3 : remplit les compétences depuis GitHub (dépôts personnels, langages), sans jamais
// toucher aux Proof XP. Appelé par le worker après l'inscription, ou par l'utilisateur.
export class ImportGithubProfile {
  constructor(
    private readonly tokens: GithubTokenSource,
    // Seules les deux lectures du profil sont nécessaires ici.
    private readonly github: Pick<GithubApi, 'listOwnedRepos' | 'repoLanguages'>,
    private readonly skills: SkillStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Réimport demandé par l'utilisateur : limité à une fois par heure. */
  async refresh(userId: string): Promise<ImportSummary> {
    const last = await this.skills.lastImportAt(userId);
    const elapsed = last ? this.now().getTime() - last.getTime() : Infinity;
    if (elapsed < REFRESH_INTERVAL_MS) {
      throw new RefreshTooSoonError(Math.ceil((REFRESH_INTERVAL_MS - elapsed) / 1000));
    }
    return this.execute(userId);
  }

  async execute(userId: string): Promise<ImportSummary> {
    const token = await this.tokens.tokenFor(userId);
    if (!token) throw new GithubNotLinkedError(`Aucun compte GitHub lié pour ${userId}`);

    const repos = await this.github.listOwnedRepos(token);
    const candidates = repos
      .filter((r) => !r.fork && r.sizeKb > 0)
      .sort((a, b) => (b.pushedAt?.getTime() ?? 0) - (a.pushedAt?.getTime() ?? 0))
      .slice(0, MAX_REPOS_ANALYSED);
    const withLanguages = await this.withLanguages(token, candidates);

    const index = await this.skills.tagIndex();
    const signals = computeGithubSignals(
      withLanguages,
      (language) => index.get(language.toLowerCase()),
      this.now(),
    );
    await this.skills.replaceGithubSignals(userId, signals);

    const summary = {
      reposListed: repos.length,
      reposAnalysed: candidates.length,
      skills: signals.length,
    };
    await this.skills.recordImport(userId, summary, this.now());
    return summary;
  }

  private async withLanguages(token: string, repos: GithubRepo[]) {
    const result = new Array<GithubRepo & { languages: Record<string, number> }>(repos.length);
    let next = 0;
    const worker = async () => {
      while (next < repos.length) {
        const i = next++;
        const repo = repos[i]!;
        result[i] = { ...repo, languages: await this.github.repoLanguages(token, repo.fullName) };
      }
    };
    await Promise.all(Array.from({ length: Math.min(LANGUAGE_CONCURRENCY, repos.length) }, worker));
    return result;
  }
}
