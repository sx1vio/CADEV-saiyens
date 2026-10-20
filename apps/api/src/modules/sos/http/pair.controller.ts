import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import {
  ListPairSessionsResponse,
  PairSessionView,
  ProposePairRequest,
  RespondPairRequest,
} from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { type ActionDefinition, runAction } from '../../../infrastructure/actions/action-registry';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { SosActions, pairView } from './sos.actions';

class ProposePairRequestDto extends createZodDto(ProposePairRequest) {}
class RespondPairRequestDto extends createZodDto(RespondPairRequest) {}
class PairSessionViewDto extends createZodDto(PairSessionView) {}
class ListPairSessionsResponseDto extends createZodDto(ListPairSessionsResponse) {}

const person = {
  select: { id: true, handle: true, displayName: true, avatarUrl: true, isDemo: true },
};

/**
 * S5 : créneau de pair programming. Le lien de visio n'est jamais public : la liste ne renvoie
 * que les sessions où la personne connectée est l'aidant (hôte) ou l'auteur (invité).
 */
@Controller('api/v1')
@UseGuards(SessionGuard)
export class PairController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly actions: SosActions,
    private readonly prisma: PrismaService,
  ) {}

  private async run<P>(
    action: ActionDefinition<P>,
    auth: AuthenticatedUser,
    key: string,
    payload: P,
    res: Response,
  ): Promise<PairSessionView> {
    const outcome = await runAction(this.idempotency, action, auth.userId, key, payload);
    res.status(outcome.status);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body as PairSessionView;
  }

  @Post('questions/:id/pair')
  @ApiCreatedResponse({ type: PairSessionViewDto })
  propose(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) questionId: string,
    @Body() body: ProposePairRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PairSessionView> {
    return this.run(this.actions.pairPropose, auth, key, { ...body, questionId }, res);
  }

  @Post('pair-sessions/:id/respond')
  @HttpCode(200)
  @ApiOkResponse({ type: PairSessionViewDto })
  respond(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) pairId: string,
    @Body() body: RespondPairRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PairSessionView> {
    return this.run(this.actions.pairRespond, auth, key, { ...body, pairId }, res);
  }

  @Get('questions/:id/pair-sessions')
  @ApiOkResponse({ type: ListPairSessionsResponseDto })
  async list(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) questionId: string,
  ): Promise<ListPairSessionsResponse> {
    const rows = await this.prisma.pairSession.findMany({
      where: {
        questionId,
        question: { hiddenAt: null },
        OR: [{ hostId: auth.userId }, { guestId: auth.userId }],
      },
      include: { host: person, guest: person },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    return { data: rows.map(pairView) };
  }
}
