import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import {
  ConfirmFeedbackResponse,
  CreateFeedbackRequest,
  FeedbackRequestView,
  ListFeedbackRequestsQuery,
  ListFeedbackRequestsResponse,
} from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { runAction } from '../../../infrastructure/actions/action-registry';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from '../../identity';
import { RoomReader } from '../infrastructure/room.reader';
import { FeedbackActions } from './feedback.actions';

class CreateFeedbackRequestDto extends createZodDto(CreateFeedbackRequest) {}
class FeedbackRequestViewDto extends createZodDto(FeedbackRequestView) {}
class ListFeedbackRequestsQueryDto extends createZodDto(ListFeedbackRequestsQuery) {}
class ListFeedbackRequestsResponseDto extends createZodDto(ListFeedbackRequestsResponse) {}
class ConfirmFeedbackResponseDto extends createZodDto(ConfirmFeedbackResponse) {}

const notFound = () =>
  new NotFoundException({ code: 'not_found', title: 'Feedback request or room not found' });

/** R6 : demander un retour ou une revue de code, la prendre, la confirmer. */
@Controller('api/v1')
export class FeedbackController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly reader: RoomReader,
    private readonly actions: FeedbackActions,
  ) {}

  private replayed(res: Response, outcome: { replayed: boolean; status: number }) {
    res.status(outcome.status);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
  }

  private async viewOr404(id: string): Promise<FeedbackRequestView> {
    const fr = await this.reader.feedbackRequest(id);
    if (!fr || fr.roomHidden) throw notFound();
    const { roomHidden: _h, public: _p, ...view } = fr;
    return view;
  }

  /** Flux de la stack : demandes ouvertes des salles publiques (filtre `tags=docker,react`). */
  @Get('feedback-requests')
  @ApiOkResponse({ type: ListFeedbackRequestsResponseDto })
  feed(@Query() query: ListFeedbackRequestsQueryDto): Promise<ListFeedbackRequestsResponse> {
    return this.reader.feedbackFeed(query);
  }

  /** Une demande, visible comme sa salle. */
  @Get('feedback-requests/:id')
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: FeedbackRequestViewDto })
  async one(
    @Param('id', ParseUUIDPipe) id: string,
    @OptionalUser() viewer: AuthenticatedUser | null,
  ): Promise<FeedbackRequestView> {
    const fr = await this.reader.feedbackRequest(id);
    if (!fr || fr.roomHidden) throw notFound();
    if (!fr.public && !(viewer && (await this.reader.roleOf(fr.room.id, viewer.userId)))) {
      throw notFound();
    }
    const { roomHidden: _h, public: _p, ...view } = fr;
    return view;
  }

  /** Demandes d'une salle, publiques comme ses tâches. */
  @Get('rooms/:id/feedback-requests')
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: ListFeedbackRequestsResponseDto })
  async list(
    @Param('id', ParseUUIDPipe) roomId: string,
    @OptionalUser() viewer: AuthenticatedUser | null,
  ): Promise<ListFeedbackRequestsResponse> {
    const room = await this.reader.roomRepo(roomId);
    if (!room || room.hiddenAt) throw notFound();
    if (
      room.visibility !== 'public' &&
      !(viewer && (await this.reader.roleOf(roomId, viewer.userId)))
    ) {
      throw notFound();
    }
    return {
      data: await this.reader.feedbackRequests(roomId),
      page: { hasMore: false, nextCursor: null },
    };
  }

  /** Un membre demande un retour ou une revue ; les autres membres sont notifiés. */
  @Post('rooms/:id/feedback-requests')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: FeedbackRequestViewDto })
  async create(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) roomId: string,
    @Body() body: CreateFeedbackRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FeedbackRequestView> {
    const outcome = await runAction(this.idempotency, this.actions.create, auth.userId, key, {
      ...body,
      roomId,
    });
    this.replayed(res, outcome);
    return this.viewOr404((outcome.body as { id: string }).id);
  }

  /** Un autre dev prend la demande ; le demandeur est notifié. */
  @Post('feedback-requests/:id/take')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: FeedbackRequestViewDto })
  async take(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FeedbackRequestView> {
    const outcome = await runAction(this.idempotency, this.actions.take, auth.userId, key, { id });
    this.replayed(res, outcome);
    return this.viewOr404(id);
  }

  /** Le demandeur confirme la revue : +8 XP au relecteur pour une revue de code. */
  @Post('feedback-requests/:id/confirm')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: ConfirmFeedbackResponseDto })
  async confirm(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ConfirmFeedbackResponse> {
    const outcome = await runAction(this.idempotency, this.actions.confirm, auth.userId, key, {
      id,
    });
    this.replayed(res, outcome);
    const result = outcome.body as {
      points: number;
      withheld: Array<{ kind: string; reason: string }>;
    };
    return { request: await this.viewOr404(id), points: result.points, withheld: result.withheld };
  }

  /** Le demandeur retire sa demande tant qu'elle n'est pas confirmée. */
  @Post('feedback-requests/:id/cancel')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: FeedbackRequestViewDto })
  async cancel(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FeedbackRequestView> {
    const outcome = await runAction(this.idempotency, this.actions.cancel, auth.userId, key, {
      id,
    });
    this.replayed(res, outcome);
    return this.viewOr404(id);
  }
}
