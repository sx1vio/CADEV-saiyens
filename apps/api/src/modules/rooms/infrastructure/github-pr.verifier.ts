import { Inject, Injectable } from '@nestjs/common';
import {
  GITHUB_API,
  type GithubApi,
  GithubApiError,
  type GithubIssue,
  parsePullUrl,
} from '../../github';
import { GithubTokenReader } from '../../identity';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { GithubNotLinkedError, GithubUnavailableError } from '../domain/room';
import { type PullRef, type Verification, verificationOf } from '../domain/task';

export interface PrCheck {
  pull: PullRef | null;
  verification: Verification;
  /** GitHub n'a pas répondu : la tâche est close « déclarée » et un job réessaie (09 § R9). */
  unavailable: boolean;
}

/** R9 et R2 : lectures GitHub faites hors transaction, avec le jeton de l'utilisateur. */
@Injectable()
export class GithubPrVerifier {
  constructor(
    private readonly tokens: GithubTokenReader,
    @Inject(GITHUB_API) private readonly github: GithubApi,
    private readonly prisma: PrismaService,
  ) {}

  /** Vérifie que la PR est fusionnée et que son auteur est l'assigné de la tâche. */
  async check(
    actorId: string,
    prUrl: string | null | undefined,
    assigneeId: string | null,
  ): Promise<PrCheck> {
    const pull = prUrl ? parsePullUrl(prUrl) : null;
    if (!pull || !assigneeId) return { pull, verification: 'declared', unavailable: false };
    const token = await this.tokens.tokenFor(actorId);
    if (!token) return { pull, verification: 'declared', unavailable: false };
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
      select: { githubId: true },
    });
    try {
      const pr = await this.github.getPullRequest(token, pull.fullName, pull.number);
      return {
        pull,
        verification: verificationOf(pr, assignee?.githubId ?? null),
        unavailable: false,
      };
    } catch (err) {
      if (err instanceof GithubApiError)
        return { pull, verification: 'declared', unavailable: true };
      throw err;
    }
  }

  async openIssues(actorId: string, repoFullName: string): Promise<GithubIssue[]> {
    const token = await this.tokens.tokenFor(actorId);
    if (!token) throw new GithubNotLinkedError();
    try {
      return await this.github.listOpenIssues(token, repoFullName);
    } catch (err) {
      if (err instanceof GithubApiError) throw new GithubUnavailableError(err.message);
      throw err;
    }
  }
}
