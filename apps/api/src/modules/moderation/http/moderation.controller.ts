import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiExcludeEndpoint, ApiOkResponse } from '@nestjs/swagger';
import {
  CreateReportRequest,
  ListAuditQuery,
  ListAuditResponse,
  ListReportsQuery,
  ListReportsResponse,
  ReportActionRequest,
  ReportActionResponse,
  ReportView,
} from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { AdminSessionGuard } from '../../backoffice';
import { Moderation } from '../application/moderation';
import {
  ReportAlreadyHandledError,
  ReportNotFoundError,
  ReportTargetNotFoundError,
  TargetNotHideableError,
} from '../domain/moderation';
import type { ReportState } from '../domain/ports';
import { PrismaModerationWriter } from '../infrastructure/prisma-moderation.writer';
import { ReportReader } from '../infrastructure/report.reader';

class CreateReportRequestDto extends createZodDto(CreateReportRequest) {}
class ReportViewDto extends createZodDto(ReportView) {}
class ListReportsQueryDto extends createZodDto(ListReportsQuery) {}
class ListReportsResponseDto extends createZodDto(ListReportsResponse) {}
class ReportActionRequestDto extends createZodDto(ReportActionRequest) {}
class ReportActionResponseDto extends createZodDto(ReportActionResponse) {}
class ListAuditQueryDto extends createZodDto(ListAuditQuery) {}
class ListAuditResponseDto extends createZodDto(ListAuditResponse) {}

const view = (r: ReportState): ReportView => ({ ...r, createdAt: r.createdAt.toISOString() });

function toHttp(err: unknown): never {
  if (err instanceof ReportNotFoundError) {
    throw new NotFoundException({ code: 'not_found', title: 'Report not found' });
  }
  if (err instanceof ReportTargetNotFoundError) {
    throw new UnprocessableEntityException({
      code: 'report.target_not_found',
      title: 'The reported content does not exist',
    });
  }
  if (err instanceof TargetNotHideableError) {
    throw new UnprocessableEntityException({
      code: 'report.target_not_hideable',
      title: 'An account cannot be hidden; dismiss the report or handle it outside M1',
    });
  }
  if (err instanceof ReportAlreadyHandledError) {
    throw new ConflictException({
      code: 'report.already_handled',
      title: 'This report was already handled',
    });
  }
  throw err;
}

// M1 : signalement (connecté) et file de modération (administrateurs), décisions journalisées (M4).
@Controller('api/v1')
export class ModerationController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly moderation: Moderation,
    private readonly reader: ReportReader,
  ) {}

  /** M1 : signaler un contenu. Le même signalement renvoyé : 200 et le signalement d'origine. */
  @Post('reports')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: ReportViewDto })
  async report(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Body() body: CreateReportRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReportView> {
    const outcome = await this.idempotency
      .run({ userId: auth.userId, key, endpoint: 'POST /reports', body }, async (tx) => {
        const { report, created } = await this.moderation.report(new PrismaModerationWriter(tx), {
          reporterId: auth.userId,
          ...body,
        });
        return { status: created ? 201 : 200, body: view(report) };
      })
      .catch(toHttp);
    res.status(outcome.status);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body;
  }

  /** M1 : file de modération, signalements ouverts par défaut. */
  @Get('admin/reports')
  @ApiExcludeEndpoint()
  @UseGuards(AdminSessionGuard)
  @ApiOkResponse({ type: ListReportsResponseDto })
  list(@Query() query: ListReportsQueryDto): Promise<ListReportsResponse> {
    return this.reader.list(query);
  }

  /** M4 : journal d'audit des décisions de modération (filtrable par contenu). */
  @Get('admin/audit')
  @ApiExcludeEndpoint()
  @UseGuards(AdminSessionGuard)
  @ApiOkResponse({ type: ListAuditResponseDto })
  audit(@Query() query: ListAuditQueryDto): Promise<ListAuditResponse> {
    return this.reader.audit(query);
  }

  /** M1, M4 : masquer, rétablir ou rejeter ; annuler les Proof XP sur demande. */
  @Post('admin/reports/:id/action')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  @UseGuards(AdminSessionGuard)
  @ApiOkResponse({ type: ReportActionResponseDto })
  async act(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReportActionRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReportActionResponse> {
    const outcome = await this.idempotency
      .run(
        { userId: auth.userId, key, endpoint: `POST /admin/reports/${id}/action`, body },
        async (tx) => {
          const out = await this.moderation.act(new PrismaModerationWriter(tx), tx, {
            reportId: id,
            adminId: auth.userId,
            ...body,
          });
          return { status: 200, body: { ...out, report: view(out.report) } };
        },
      )
      .catch(toHttp);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body;
  }
}
