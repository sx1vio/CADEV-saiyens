import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import {
  AcceptAnswerResponse,
  PostAnswerRequest,
  PostAnswerResponse,
  VoteResponse,
  type XpOutcome,
} from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { publishToTopic } from '../../../infrastructure/realtime/realtime.publisher';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { SelfVoteError } from '../../reputation';
import { Answers } from '../application/answers';
import {
  AlreadyResolvedError,
  AnswerNotFoundError,
  NotQuestionAuthorError,
  OwnAnswerVoteError,
  QuestionClosedError,
  QuestionNotFoundError,
} from '../domain/answer';
import type { AnswerWriter, XpAward } from '../domain/ports';
import { PrismaAnswerWriter } from '../infrastructure/prisma-answer.writer';

class PostAnswerRequestDto extends createZodDto(PostAnswerRequest) {}
class PostAnswerResponseDto extends createZodDto(PostAnswerResponse) {}
class VoteResponseDto extends createZodDto(VoteResponse) {}
class AcceptAnswerResponseDto extends createZodDto(AcceptAnswerResponse) {}

/** Traduction des erreurs métier en codes stables (docs/architecture/06-api.md#erreurs). */
function toHttp(err: unknown): never {
  if (err instanceof QuestionNotFoundError || err instanceof AnswerNotFoundError) {
    throw new NotFoundException({ code: 'not_found', title: 'Question or answer not found' });
  }
  if (err instanceof QuestionClosedError) {
    throw new ConflictException({ code: 'question.not_open', title: 'Question is closed' });
  }
  if (err instanceof AlreadyResolvedError) {
    throw new ConflictException({
      code: 'question.already_resolved',
      title: 'Question already resolved by another answer',
    });
  }
  if (err instanceof NotQuestionAuthorError) {
    throw new ForbiddenException({
      code: 'forbidden',
      title: 'Only the question author can accept',
    });
  }
  if (err instanceof OwnAnswerVoteError || err instanceof SelfVoteError) {
    throw new ForbiddenException({
      code: 'xp.self_vote',
      title: 'You cannot vote for your own answer',
    });
  }
  throw err;
}

async function xpOutcome(writer: AnswerWriter, xp: XpAward): Promise<XpOutcome> {
  const handles = await writer.handles([
    ...xp.events.map((e) => e.userId),
    ...xp.withheld.map((w) => w.userId),
  ]);
  const handle = (id: string) => handles.get(id) ?? 'inconnu';
  return {
    granted: xp.events.map((e) => ({ handle: handle(e.userId), kind: e.kind, points: e.points })),
    withheld: xp.withheld.map((w) => ({
      handle: handle(w.userId),
      kind: w.kind,
      reason: w.reason,
    })),
  };
}

@Controller('api/v1')
@UseGuards(SessionGuard)
export class AnswersController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly answers: Answers,
  ) {}

  /** S4 : répondre. Idempotent ; l'auteur de la question est notifié. */
  @Post('questions/:id/answers')
  @ApiCreatedResponse({ type: PostAnswerResponseDto })
  async post(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) questionId: string,
    @Body() body: PostAnswerRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PostAnswerResponse> {
    const outcome = await this.idempotency
      .run(
        { userId: auth.userId, key, endpoint: `POST /questions/${questionId}/answers`, body },
        async (tx) => {
          const { answer, secretsMasked, created } = await this.answers.post(
            new PrismaAnswerWriter(tx),
            tx,
            { questionId, authorId: auth.userId, clientId: body.clientId, body: body.body },
          );
          if (created) {
            await publishToTopic(tx, `question:${questionId}`, 'answer.created', {
              questionId,
              answerId: answer.id,
            });
          }
          return {
            status: created ? HttpStatus.CREATED : HttpStatus.OK,
            body: {
              id: answer.id,
              clientId: answer.clientId,
              questionId: answer.questionId,
              body: answer.body,
              isAccepted: answer.isAccepted,
              helpfulCount: answer.helpfulCount,
              version: answer.version,
              createdAt: answer.createdAt.toISOString(),
              author: answer.author,
              secretsMasked,
            },
          };
        },
      )
      .catch(toHttp);
    res.status(outcome.status);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body;
  }

  /** S4, X2 : « Réponse utile ». Pas pour soi ; voter deux fois ne compte qu'une fois. */
  @Post('answers/:id/vote')
  @HttpCode(200)
  @ApiOkResponse({ type: VoteResponseDto })
  async vote(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) answerId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VoteResponse> {
    const outcome = await this.idempotency
      .run(
        { userId: auth.userId, key, endpoint: `POST /answers/${answerId}/vote`, body: {} },
        async (tx) => {
          const writer = new PrismaAnswerWriter(tx);
          const result = await this.answers.vote(writer, tx, { answerId, voterId: auth.userId });
          return {
            status: HttpStatus.OK,
            body: {
              answerId,
              helpfulCount: result.helpfulCount,
              counted: result.counted,
              xp: await xpOutcome(writer, result.xp),
            },
          };
        },
      )
      .catch(toHttp);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body;
  }

  /** S4, X1 : l'auteur valide la réponse ; question résolue, Proof XP attribués. */
  @Post('answers/:id/accept')
  @HttpCode(200)
  @ApiOkResponse({ type: AcceptAnswerResponseDto })
  async accept(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) answerId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AcceptAnswerResponse> {
    const outcome = await this.idempotency
      .run(
        { userId: auth.userId, key, endpoint: `POST /answers/${answerId}/accept`, body: {} },
        async (tx) => {
          const writer = new PrismaAnswerWriter(tx);
          const result = await this.answers.accept(writer, tx, { answerId, actorId: auth.userId });
          if (result.changed) {
            await publishToTopic(tx, `question:${result.questionId}`, 'answer.accepted', {
              questionId: result.questionId,
              answerId,
            });
          }
          return {
            status: HttpStatus.OK,
            body: {
              questionId: result.questionId,
              answerId: result.answerId,
              status: 'resolved' as const,
              resolvedAt: result.resolvedAt.toISOString(),
              xp: await xpOutcome(writer, result.xp),
            },
          };
        },
      )
      .catch(toHttp);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body;
  }
}
