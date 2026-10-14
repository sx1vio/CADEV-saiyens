import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from '../../identity';
import { AskQuestion } from '../application/ask-question';
import { TooManyQuestionsError, UnknownTagsError } from '../domain/question';
import { PrismaQuestionWriter } from '../infrastructure/prisma-question.writer';
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

@Controller('api/v1/questions')
export class QuestionsController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly jobs: JobQueue,
    private readonly reader: QuestionReader,
    private readonly askQuestion: AskQuestion,
  ) {}

  /** S1 : poser une question. Idempotent ; déclenche la piste IA (S2) après validation. */
  @Post()
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: AskQuestionResponseDto })
  async ask(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Body() body: AskQuestionRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AskQuestionResponse> {
    try {
      const outcome = await this.idempotency.run(
        { userId: auth.userId, key, endpoint: 'POST /questions', body },
        async (tx) => {
          const { question, secretsMasked, created } = await this.askQuestion.execute(
            new PrismaQuestionWriter(tx),
            {
              authorId: auth.userId,
              clientId: body.clientId,
              title: body.title,
              body: body.body,
              codeSnippet: body.codeSnippet ?? null,
              tagSlugs: body.tagSlugs,
              urgency: body.urgency,
              lang: body.lang,
            },
          );
          return {
            status: created ? HttpStatus.CREATED : HttpStatus.OK,
            body: {
              id: question.id,
              clientId: question.clientId,
              status: question.status,
              aiStatus: question.aiStatus,
              version: question.version,
              createdAt: question.createdAt.toISOString(),
              secretsMasked,
              author: question.author,
            },
            // S2 et S3 : piste IA et matching en tâche de fond, jamais bloquants.
            afterCommit: created
              ? async () => {
                  await this.jobs.send(JOBS.aiHint, { questionId: question.id }, question.id);
                  await this.jobs.send(JOBS.matchingRun, { questionId: question.id }, question.id);
                }
              : undefined,
          };
        },
      );
      res.status(outcome.status);
      res.setHeader('Location', `/api/v1/questions/${outcome.body.id}`);
      res.setHeader('ETag', `"q-${outcome.body.id}-v${outcome.body.version}"`);
      if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
      return outcome.body;
    } catch (err) {
      if (err instanceof TooManyQuestionsError) {
        res.setHeader('Retry-After', String(err.retryAfterSeconds));
        throw new HttpException(
          { code: 'rate_limited', title: 'Too many questions in the last hour' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (err instanceof UnknownTagsError) {
        throw new UnprocessableEntityException({
          code: 'question.tags_unknown',
          title: 'Unknown tags',
          errors: err.slugs.map((slug) => ({
            path: 'tagSlugs',
            code: 'unknown_tag',
            params: { slug },
          })),
        });
      }
      throw err;
    }
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
