import { Inject, Injectable } from '@nestjs/common';
import { GITHUB_API, type GithubApi, GithubApiError } from '../../github';
import { GithubTokenReader } from '../../identity';
import type { RepoVerifier, VerifiedRepo } from '../domain/ports';
import {
  GithubNotLinkedError,
  GithubUnavailableError,
  RepoNotFoundError,
  RepoNotOwnedError,
  RepoPrivateError,
} from '../domain/room';

/**
 * R1 : le dépôt existe, il est public, et le créateur peut y pousser (lecture seule, avec son
 * jeton). Sans ce contrôle, n'importe qui pourrait se faire passer pour un projet connu.
 */
@Injectable()
export class GithubRepoVerifier implements RepoVerifier {
  constructor(
    private readonly tokens: GithubTokenReader,
    @Inject(GITHUB_API) private readonly github: GithubApi,
  ) {}

  async verify(userId: string, fullName: string): Promise<VerifiedRepo> {
    const token = await this.tokens.tokenFor(userId);
    if (!token) throw new GithubNotLinkedError();
    try {
      const repo = await this.github.getRepo(token, fullName);
      if (!repo) throw new RepoNotFoundError();
      if (repo.private) throw new RepoPrivateError();
      if (!repo.canPush) throw new RepoNotOwnedError();
      return { fullName: repo.fullName, htmlUrl: repo.htmlUrl };
    } catch (err) {
      if (err instanceof GithubApiError) throw new GithubUnavailableError(err.message);
      throw err;
    }
  }
}
