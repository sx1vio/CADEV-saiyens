import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { CreatePreflightRequest, ListPreflightResponse, PreflightReport } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { AllowApiToken, type AuthenticatedUser, CurrentUser } from '../../identity';
import {
  NothingToCheckError,
  PreflightBusyError,
  PreflightQuotaError,
  RunPreflight,
} from '../application/run-preflight';
import { toMarkdown } from '../domain/report';
import { reportLinks } from './report-links';
import { PreflightRepository } from '../infrastructure/preflight.repository';

class CreatePreflightRequestDto extends createZodDto(CreatePreflightRequest) {}
class PreflightReportDto extends createZodDto(PreflightReport) {}
class ListPreflightResponseDto extends createZodDto(ListPreflightResponse) {}

const notFound = () =>
  new NotFoundException({ code: 'not_found', title: 'Preflight report not found' });

function toHttp(err: unknown): never {
  if (err instanceof PreflightQuotaError) {
    throw new HttpException(
      { code: 'preflight.quota', title: 'Hourly preflight limit reached' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (err instanceof PreflightBusyError) {
    throw new HttpException(
      { code: 'preflight.in_progress', title: 'A preflight is already running' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (err instanceof NothingToCheckError) {
    if (err.reason === 'github_rate_limited') {
      throw new HttpException(
        { code: 'preflight.github_rate_limited', title: 'GitHub API rate limit reached' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    throw new UnprocessableEntityException({
      code: `preflight.${err.reason}`,
      title:
        err.reason === 'repo_not_found'
          ? 'Repository not found or not public'
          : 'The application did not answer, or its address is not public',
    });
  }
  throw err;
}

/**
 * Pré-vol : lancer une vérification (session ou jeton d'API personnel, quota horaire) ; lire un rapport par son
 * identifiant (public, non listé), en JSON ou en Markdown pour l'agent IA du développeur.
 */
@Controller('api/v1/preflight')
export class PreflightController {
  constructor(
    private readonly runner: RunPreflight,
    private readonly reports: PreflightRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post()
  @AllowApiToken()
  @ApiOkResponse({ type: PreflightReportDto })
  async create(
    @CurrentUser() auth: AuthenticatedUser,
    @Body() body: CreatePreflightRequestDto,
  ): Promise<PreflightReport> {
    const id = await this.runner
      .run({ userId: auth.userId, url: body.url ?? null, repo: body.repo ?? null })
      .catch(toHttp);
    const report = await this.reports.get(id);
    if (!report) throw notFound();
    return report;
  }

  @Get()
  @AllowApiToken()
  @ApiOkResponse({ type: ListPreflightResponseDto })
  async mine(@CurrentUser() auth: AuthenticatedUser): Promise<ListPreflightResponse> {
    return { items: await this.reports.listMine(auth.userId) };
  }

  @Get(':id')
  @ApiOkResponse({ type: PreflightReportDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<PreflightReport> {
    const report = await this.reports.get(id);
    if (!report) throw notFound();
    return report;
  }

  @Get(':id/report.md')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  async markdown(@Param('id', ParseUUIDPipe) id: string): Promise<string> {
    const report = await this.reports.get(id);
    if (!report) throw notFound();
    const { page, json } = reportLinks(this.env, id);
    return toMarkdown(report, { page, json });
  }
}
