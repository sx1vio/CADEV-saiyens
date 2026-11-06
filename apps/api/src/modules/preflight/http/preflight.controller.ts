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
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  CreatePreflightRequest,
  ListPreflightResponse,
  PreflightOwnership,
  PreflightReport,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { AllowApiToken, type AuthenticatedUser, CurrentUser } from '../../identity';
import {
  LoadTestBusyError,
  LoadTestNeedsUrlError,
  LoadTestQuotaError,
  NothingToCheckError,
  OwnershipRequiredError,
  PreflightBusyError,
  PreflightQuotaError,
  RunPreflight,
} from '../application/run-preflight';
import { ownershipInstructions } from '../domain/ownership';
import { verifyOwnership } from '../infrastructure/ownership.probe';
import { SafeFetcher } from '../infrastructure/safe-fetch';
import { toMarkdown } from '../domain/report';
import { reportLinks } from './report-links';
import { PreflightRepository } from '../infrastructure/preflight.repository';

class CreatePreflightRequestDto extends createZodDto(CreatePreflightRequest) {}
class PreflightReportDto extends createZodDto(PreflightReport) {}
class ListPreflightResponseDto extends createZodDto(ListPreflightResponse) {}
class PreflightOwnershipDto extends createZodDto(PreflightOwnership) {}

const notFound = () =>
  new NotFoundException({ code: 'not_found', title: 'Preflight report not found' });

function toHttp(err: unknown): never {
  if (err instanceof OwnershipRequiredError) {
    throw new UnprocessableEntityException({
      code: 'preflight.ownership_required',
      title: 'Prove you control this domain before a load test',
    });
  }
  if (err instanceof LoadTestNeedsUrlError) {
    throw new UnprocessableEntityException({
      code: 'preflight.load_needs_url',
      title: 'A load test needs the address of the application',
    });
  }
  if (err instanceof LoadTestQuotaError) {
    throw new HttpException(
      { code: 'preflight.load_quota', title: 'Hourly load test limit reached' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (err instanceof LoadTestBusyError) {
    throw new HttpException(
      { code: 'preflight.load_busy', title: 'Another load test is running, retry in a minute' },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
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
      .run({
        userId: auth.userId,
        url: body.url ?? null,
        repo: body.repo ?? null,
        loadTest: body.loadTest ?? false,
        systalink: body.systalink ?? null,
      })
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

  /** Comment prouver que l'on contrôle le domaine de `url` (et si c'est déjà fait). */
  @Get('ownership')
  @AllowApiToken()
  @ApiOkResponse({ type: PreflightOwnershipDto })
  async ownership(
    @CurrentUser() auth: AuthenticatedUser,
    @Query('url') url: string,
  ): Promise<PreflightOwnership> {
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (parsed.protocol !== 'https:') throw new Error('https');
    } catch {
      throw new UnprocessableEntityException({
        code: 'preflight.bad_url',
        title: 'An https:// address is required',
      });
    }
    const proof = ownershipInstructions(this.env.SESSION_SECRET, auth.userId, parsed.toString());
    const verified = await verifyOwnership(new SafeFetcher(AbortSignal.timeout(12_000)), proof);
    return { ...proof, verified: verified !== null };
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
