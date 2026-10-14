import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import {
  AcceptAnswerResponse,
  PostAnswerRequest,
  PostAnswerResponse,
  UpdateAnswerRequest,
  UpdateAnswerResponse,
  VoteResponse,
} from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { type ActionDefinition, runAction } from '../../../infrastructure/actions/action-registry';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { SosActions } from './sos.actions';

class PostAnswerRequestDto extends createZodDto(PostAnswerRequest) {}
class PostAnswerResponseDto extends createZodDto(PostAnswerResponse) {}
class UpdateAnswerRequestDto extends createZodDto(UpdateAnswerRequest) {}
class UpdateAnswerResponseDto extends createZodDto(UpdateAnswerResponse) {}
class VoteResponseDto extends createZodDto(VoteResponse) {}
class AcceptAnswerResponseDto extends createZodDto(AcceptAnswerResponse) {}

@Controller('api/v1')
@UseGuards(SessionGuard)
export class AnswersController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly actions: SosActions,
  ) {}

  private async run<P, T>(
    action: ActionDefinition<P>,
    auth: AuthenticatedUser,
    key: string,
    payload: P,
    res: Response,
  ): Promise<T> {
    const outcome = await runAction(this.idempotency, action, auth.userId, key, payload);
    res.status(outcome.status);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body as T;
  }

  /** S4 : répondre. Idempotent ; l'auteur de la question est notifié. */
  @Post('questions/:id/answers')
  @ApiCreatedResponse({ type: PostAnswerResponseDto })
  post(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) questionId: string,
    @Body() body: PostAnswerRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PostAnswerResponse> {
    return this.run(this.actions.answerCreate, auth, key, { ...body, questionId }, res);
  }

  /** O4 : modifier sa réponse, avec la version connue (409 version_conflict sinon). */
  @Patch('answers/:id')
  @ApiOkResponse({ type: UpdateAnswerResponseDto })
  update(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) answerId: string,
    @Body() body: UpdateAnswerRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UpdateAnswerResponse> {
    return this.run(this.actions.answerUpdate, auth, key, { ...body, answerId }, res);
  }

  /** S4, X2 : « Réponse utile ». Pas pour soi ; voter deux fois ne compte qu'une fois. */
  @Post('answers/:id/vote')
  @HttpCode(200)
  @ApiOkResponse({ type: VoteResponseDto })
  vote(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) answerId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VoteResponse> {
    return this.run(this.actions.answerVote, auth, key, { answerId }, res);
  }

  /** S4, X1 : l'auteur valide la réponse ; question résolue, Proof XP attribués. */
  @Post('answers/:id/accept')
  @HttpCode(200)
  @ApiOkResponse({ type: AcceptAnswerResponseDto })
  accept(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) answerId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AcceptAnswerResponse> {
    return this.run(this.actions.answerAccept, auth, key, { answerId }, res);
  }
}
