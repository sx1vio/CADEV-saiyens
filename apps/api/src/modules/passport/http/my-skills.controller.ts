import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Res,
  UnprocessableEntityException,
  UseGuards,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { GithubApiError } from '../../github';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import {
  GithubNotLinkedError,
  ImportGithubProfile,
  RefreshTooSoonError,
} from '../application/import-github-profile';
import { SCORING, skillLevel } from '../domain/skill-score';
import { PrismaSkillStore } from '../infrastructure/prisma-skill.store';
import { type MySkillsResponse, MySkillsResponseDto } from './skills.dto';

@Controller('api/v1/me')
@UseGuards(SessionGuard)
export class MySkillsController {
  constructor(
    private readonly store: PrismaSkillStore,
    private readonly importer: ImportGithubProfile,
  ) {}

  /** PR1 : compétences proposées (part GitHub et part plateforme séparées, cf. PR3 et PR7). */
  @Get('skills')
  @ApiOkResponse({ type: MySkillsResponseDto })
  async skills(@CurrentUser() auth: AuthenticatedUser): Promise<MySkillsResponse> {
    const [rows, lastImportedAt] = await Promise.all([
      this.store.listSkills(auth.userId),
      this.store.lastImportAt(auth.userId),
    ]);
    return {
      skills: rows.map((r) => ({
        tag: r.tag,
        score: r.score,
        level: skillLevel(r.score),
        githubSignal: r.githubSignal,
        githubRepos: r.githubRepos,
        platformPoints: Math.min(SCORING.platformCap, Math.max(0, r.xpTag)),
      })),
      lastImportedAt: lastImportedAt?.toISOString() ?? null,
    };
  }

  /** Réimport du profil GitHub, une fois par heure au plus. */
  @Post('github/refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: MySkillsResponseDto })
  async refresh(
    @CurrentUser() auth: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MySkillsResponse> {
    try {
      await this.importer.refresh(auth.userId);
    } catch (err) {
      if (err instanceof RefreshTooSoonError) {
        res.setHeader('Retry-After', String(err.retryAfterSeconds));
        throw new HttpException(
          { code: 'rate_limited', title: 'GitHub import already done recently' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (err instanceof GithubNotLinkedError) {
        throw new UnprocessableEntityException({
          code: 'github.not_linked',
          title: 'No GitHub account linked',
        });
      }
      if (err instanceof GithubApiError && err.tokenRevoked) {
        throw new UnprocessableEntityException({
          code: 'github.token_revoked',
          title: 'GitHub access revoked, sign in again',
        });
      }
      if (err instanceof GithubApiError && err.rateLimitResetAt) {
        const seconds = Math.ceil((err.rateLimitResetAt.getTime() - Date.now()) / 1000);
        res.setHeader('Retry-After', String(Math.max(1, seconds)));
      }
      throw new ServiceUnavailableException({
        code: 'github.unavailable',
        title: 'GitHub is unavailable',
      });
    }
    return this.skills(auth);
  }
}
