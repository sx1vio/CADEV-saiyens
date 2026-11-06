import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  BenchDetail,
  CreateBenchReport,
  CreateBenchRequest,
  ListBenchQuery,
  ListBenchResponse,
  ReviewBenchReport,
  ReviewBenchReportResponse,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from '../../identity';
import { BenchService } from '../infrastructure/bench.service';
import {
  BenchError,
  NEW_ACCOUNT_DELAY_MS,
  OPEN_REQUESTS_PER_USER,
  REPORTS_PER_DAY,
} from '../domain/rules';

class CreateBenchRequestDto extends createZodDto(CreateBenchRequest) {}
class CreateBenchReportDto extends createZodDto(CreateBenchReport) {}
class ReviewBenchReportDto extends createZodDto(ReviewBenchReport) {}
class ListBenchQueryDto extends createZodDto(ListBenchQuery) {}
class ListBenchResponseDto extends createZodDto(ListBenchResponse) {}
class BenchDetailDto extends createZodDto(BenchDetail) {}
class ReviewBenchReportResponseDto extends createZodDto(ReviewBenchReportResponse) {}

const DAY = 24 * 60 * 60 * 1000;
const notFound = () =>
  new NotFoundException({ code: 'not_found', title: 'Test request not found' });
const tooMany = (code: string, title: string) =>
  new HttpException({ code, title }, HttpStatus.TOO_MANY_REQUESTS);

/** Erreurs du domaine → réponses HTTP (problem details avec un code stable pour le front). */
function toHttp(e: unknown): never {
  if (!(e instanceof BenchError)) throw e;
  const title = e.code.replace('bench.', '').replaceAll('_', ' ');
  switch (e.code) {
    case 'bench.own_request':
    case 'bench.not_requester':
      throw new ForbiddenException({ code: e.code, title });
    case 'bench.device_not_requested':
    case 'bench.network_not_requested':
      throw new UnprocessableEntityException({ code: e.code, title });
    default:
      throw new HttpException({ code: e.code, title }, HttpStatus.CONFLICT);
  }
}

// Banc d'essai : lecture publique ; publier, tester et juger un rapport demandent un compte.
@Controller('api/v1/bench')
export class BenchController {
  constructor(
    private readonly bench: BenchService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: ListBenchResponseDto })
  list(
    @Query() q: ListBenchQueryDto,
    @OptionalUser() auth: AuthenticatedUser | null,
  ): Promise<ListBenchResponse> {
    return this.bench.list(q, auth?.userId ?? null);
  }

  @Get(':id')
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: BenchDetailDto })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @OptionalUser() auth: AuthenticatedUser | null,
  ): Promise<BenchDetail> {
    const item = await this.bench.detail(id, auth?.userId ?? null);
    if (!item) throw notFound();
    return item;
  }

  @Post()
  @UseGuards(SessionGuard)
  async create(
    @Body() body: CreateBenchRequestDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<{ id: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      select: { createdAt: true },
    });
    if (user && Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_DELAY_MS)
      throw new UnprocessableEntityException({
        code: 'bench.account_too_new',
        title: 'New accounts cannot publish a test request during their first hour',
      });
    if ((await this.bench.openCount(auth.userId)) >= OPEN_REQUESTS_PER_USER)
      throw tooMany('bench.open_limit', 'Too many open test requests');
    return this.bench.create(body, auth.userId);
  }

  @Post(':id/close')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: AuthenticatedUser) {
    if (!(await this.bench.setStatus(id, auth.userId, 'closed'))) throw notFound();
  }

  @Post(':id/reopen')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async reopen(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: AuthenticatedUser) {
    if ((await this.bench.openCount(auth.userId)) >= OPEN_REQUESTS_PER_USER)
      throw tooMany('bench.open_limit', 'Too many open test requests');
    if (!(await this.bench.setStatus(id, auth.userId, 'open'))) throw notFound();
  }

  @Post(':id/reports')
  @UseGuards(SessionGuard)
  async report(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateBenchReportDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<{ id: string }> {
    if ((await this.bench.reportsSince(auth.userId, new Date(Date.now() - DAY))) >= REPORTS_PER_DAY)
      throw tooMany('bench.daily_limit', 'Daily report limit reached');
    const created = await this.bench.report(id, auth.userId, body).catch(toHttp);
    if (!created) throw notFound();
    return created;
  }

  @Post('reports/:reportId/review')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ReviewBenchReportResponseDto })
  async review(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() body: ReviewBenchReportDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<ReviewBenchReportResponse> {
    const result = await this.bench.review(reportId, auth.userId, body.decision).catch(toHttp);
    if (!result) throw notFound();
    return result;
  }
}
