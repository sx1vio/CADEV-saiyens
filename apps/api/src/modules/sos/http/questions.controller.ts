import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { UpdateQuestionRequest, UpdateQuestionResponse } from '@devhub/contracts';
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
import { QuestionReader } from '../infrastructure/question.reader';
import {
  type AskQuestionResponse,
  AskQuestionRequestDto,
  AskQuestionResponseDto,
  type ListQuestionsResponse,
  ListQuestionsQueryDto,
  ListQuestionsResponseDto,
  type QuestionDetail,
  QuestionDetailDto,
} from './dto';
import { SosActions } from './sos.actions';

class UpdateQuestionRequestDto extends createZodDto(UpdateQuestionRequest) {}
class UpdateQuestionResponseDto extends createZodDto(UpdateQuestionResponse) {}

@Controller('api/v1/questions')
export class QuestionsController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly reader: QuestionReader,
    private readonly actions: SosActions,
  ) {}

  /** S1 : poser une question. Idempotent ; déclenche la piste IA (S2) et le matching (S3). */
  @Post()
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: AskQuestionResponseDto })
  async ask(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Body() body: AskQuestionRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AskQuestionResponse> {
    const outcome = await runAction(
      this.idempotency,
      this.actions.questionCreate,
      auth.userId,
      key,
      body,
    );
    const created = outcome.body as AskQuestionResponse;
    res.status(outcome.status);
    res.setHeader('Location', `/api/v1/questions/${created.id}`);
    res.setHeader('ETag', `"q-${created.id}-v${created.version}"`);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return created;
  }

  /** O4 : modifier sa question, avec la version connue (409 version_conflict sinon). */
  @Patch(':id')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: UpdateQuestionResponseDto })
  async update(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) questionId: string,
    @Body() body: UpdateQuestionRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UpdateQuestionResponse> {
    const outcome = await runAction(
      this.idempotency,
      this.actions.questionUpdate,
      auth.userId,
      key,
      {
        ...body,
        questionId,
      },
    );
    const updated = outcome.body as UpdateQuestionResponse;
    res.setHeader('ETag', `"q-${updated.id}-v${updated.version}"`);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return updated;
  }

  /** S6, S16 : liste publique, filtres combinables et recherche plein texte. */
  @Get()
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: ListQuestionsResponseDto })
  list(
    @Query() query: ListQuestionsQueryDto,
    @OptionalUser() viewer: AuthenticatedUser | null,
  ): Promise<ListQuestionsResponse> {
    return this.reader.list(query, viewer?.userId ?? null);
  }

  /** S2, S3 : la question, sa piste IA, ses réponses et les aidants sollicités. Public. */
  @Get(':id')
  @ApiOkResponse({ type: QuestionDetailDto })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<QuestionDetail> {
    const question = await this.reader.detail(id);
    if (!question) throw new NotFoundException({ code: 'not_found', title: 'Question not found' });
    return question;
  }
}
