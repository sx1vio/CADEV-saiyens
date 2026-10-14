import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  type OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type AcceptAnswerResponse,
  type AskQuestionResponse,
  AskQuestionRequest,
  type PostAnswerResponse,
  PostAnswerRequest,
  type UpdateAnswerResponse,
  UpdateAnswerRequest,
  type UpdateQuestionResponse,
  UpdateQuestionRequest,
  type VoteResponse,
  type XpOutcome,
} from '@devhub/contracts';
import { z } from 'zod';
import {
  type ActionDefinition,
  ActionRegistry,
} from '../../../infrastructure/actions/action-registry';
import type { Tx, WriteResult } from '../../../infrastructure/idempotency/idempotency.service';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { publishToTopic } from '../../../infrastructure/realtime/realtime.publisher';
import { SelfVoteError } from '../../reputation';
import { Answers } from '../application/answers';
import { AskQuestion } from '../application/ask-question';
import { EditContent } from '../application/edit-content';
import {
  AlreadyResolvedError,
  AnswerNotFoundError,
  NotQuestionAuthorError,
  OwnAnswerVoteError,
  QuestionClosedError,
  QuestionNotFoundError,
} from '../domain/answer';
import { ContentNotFoundError, NotContentAuthorError, VersionConflictError } from '../domain/edit';
import type { AnswerWriter, XpAward } from '../domain/ports';
import { TooManyQuestionsError, UnknownTagsError } from '../domain/question';
import { PrismaAnswerWriter } from '../infrastructure/prisma-answer.writer';
import { PrismaEditWriter } from '../infrastructure/prisma-edit.writer';
import { PrismaQuestionWriter } from '../infrastructure/prisma-question.writer';

/** Traduction des erreurs métier en codes stables (docs/architecture/06-api.md#erreurs). */
export function toHttp(err: unknown): never {
  if (
    err instanceof QuestionNotFoundError ||
    err instanceof AnswerNotFoundError ||
    err instanceof ContentNotFoundError
  ) {
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
  if (err instanceof VersionConflictError) {
    throw new ConflictException({
      code: 'version_conflict',
      title: 'The content changed since your copy',
      server: err.server,
    });
  }
  if (err instanceof NotQuestionAuthorError || err instanceof NotContentAuthorError) {
    throw new ForbiddenException({ code: 'forbidden', title: 'Only the author can do this' });
  }
  if (err instanceof OwnAnswerVoteError || err instanceof SelfVoteError) {
    throw new ForbiddenException({
      code: 'xp.self_vote',
      title: 'You cannot vote for your own answer',
    });
  }
  if (err instanceof TooManyQuestionsError) {
    throw new HttpException(
      {
        code: 'rate_limited',
        title: 'Too many questions in the last hour',
        retryAfter: err.retryAfterSeconds,
      },
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

const id = z.uuid();
const QuestionCreate = AskQuestionRequest;
const QuestionUpdate = UpdateQuestionRequest.and(z.object({ questionId: id }));
const AnswerCreate = PostAnswerRequest.extend({ questionId: id });
const AnswerUpdate = UpdateAnswerRequest.extend({ answerId: id });
const AnswerTarget = z.object({ answerId: id });

const guarded =
  <P, T>(run: (tx: Tx, userId: string, p: P) => Promise<WriteResult<T>>) =>
  (tx: Tx, userId: string, p: P) =>
    run(tx, userId, p).catch(toHttp);

/**
 * Écritures de SOS Dev, partagées par les endpoints HTTP et POST /sync (même route, même corps :
 * même empreinte d'idempotence). Enregistrées au démarrage dans ActionRegistry.
 */
@Injectable()
export class SosActions implements OnModuleInit {
  constructor(
    private readonly registry: ActionRegistry,
    private readonly jobs: JobQueue,
    private readonly askQuestion: AskQuestion,
    private readonly answers: Answers,
    private readonly edit: EditContent,
  ) {}

  onModuleInit(): void {
    for (const action of this.definitions()) this.registry.register(action);
  }

  readonly questionCreate: ActionDefinition<z.infer<typeof QuestionCreate>> = {
    type: 'question.create',
    schema: QuestionCreate,
    endpoint: () => 'POST /questions',
    body: (p) => p,
    execute: guarded(async (tx, userId, body): Promise<WriteResult<AskQuestionResponse>> => {
      const { question, secretsMasked, created } = await this.askQuestion.execute(
        new PrismaQuestionWriter(tx),
        {
          authorId: userId,
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
    }),
  };

  readonly questionUpdate: ActionDefinition<z.infer<typeof QuestionUpdate>> = {
    type: 'question.update',
    schema: QuestionUpdate,
    refs: [{ field: 'questionId', kind: 'question' }],
    endpoint: (p) => `PATCH /questions/${p.questionId}`,
    body: ({ questionId: _q, ...rest }) => rest,
    execute: guarded(async (tx, userId, p): Promise<WriteResult<UpdateQuestionResponse>> => {
      const { question, secretsMasked } = await this.edit.question(new PrismaEditWriter(tx), {
        questionId: p.questionId,
        actorId: userId,
        baseVersion: p.baseVersion,
        title: p.title,
        body: p.body,
        codeSnippet: p.codeSnippet,
      });
      return {
        status: HttpStatus.OK,
        body: {
          id: question.id,
          version: question.version,
          title: question.title,
          body: question.body,
          codeSnippet: question.codeSnippet,
          secretsMasked,
        },
      };
    }),
  };

  readonly answerCreate: ActionDefinition<z.infer<typeof AnswerCreate>> = {
    type: 'answer.create',
    schema: AnswerCreate,
    refs: [{ field: 'questionId', kind: 'question' }],
    endpoint: (p) => `POST /questions/${p.questionId}/answers`,
    body: ({ questionId: _q, ...rest }) => rest,
    execute: guarded(async (tx, userId, p): Promise<WriteResult<PostAnswerResponse>> => {
      const { answer, secretsMasked, created } = await this.answers.post(
        new PrismaAnswerWriter(tx),
        tx,
        { questionId: p.questionId, authorId: userId, clientId: p.clientId, body: p.body },
      );
      if (created) {
        await publishToTopic(tx, `question:${p.questionId}`, 'answer.created', {
          questionId: p.questionId,
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
    }),
  };

  readonly answerUpdate: ActionDefinition<z.infer<typeof AnswerUpdate>> = {
    type: 'answer.update',
    schema: AnswerUpdate,
    refs: [{ field: 'answerId', kind: 'answer' }],
    endpoint: (p) => `PATCH /answers/${p.answerId}`,
    body: ({ answerId: _a, ...rest }) => rest,
    execute: guarded(async (tx, userId, p): Promise<WriteResult<UpdateAnswerResponse>> => {
      const { answer, secretsMasked } = await this.edit.answer(new PrismaEditWriter(tx), {
        answerId: p.answerId,
        actorId: userId,
        baseVersion: p.baseVersion,
        body: p.body,
      });
      return {
        status: HttpStatus.OK,
        body: { id: answer.id, version: answer.version, body: answer.body, secretsMasked },
      };
    }),
  };

  readonly answerVote: ActionDefinition<z.infer<typeof AnswerTarget>> = {
    type: 'answer.vote',
    schema: AnswerTarget,
    refs: [{ field: 'answerId', kind: 'answer' }],
    endpoint: (p) => `POST /answers/${p.answerId}/vote`,
    body: () => ({}),
    execute: guarded(async (tx, userId, p): Promise<WriteResult<VoteResponse>> => {
      const writer = new PrismaAnswerWriter(tx);
      const result = await this.answers.vote(writer, tx, { answerId: p.answerId, voterId: userId });
      return {
        status: HttpStatus.OK,
        body: {
          answerId: p.answerId,
          helpfulCount: result.helpfulCount,
          counted: result.counted,
          xp: await xpOutcome(writer, result.xp),
        },
      };
    }),
  };

  readonly answerAccept: ActionDefinition<z.infer<typeof AnswerTarget>> = {
    type: 'answer.accept',
    schema: AnswerTarget,
    refs: [{ field: 'answerId', kind: 'answer' }],
    endpoint: (p) => `POST /answers/${p.answerId}/accept`,
    body: () => ({}),
    execute: guarded(async (tx, userId, p): Promise<WriteResult<AcceptAnswerResponse>> => {
      const writer = new PrismaAnswerWriter(tx);
      const result = await this.answers.accept(writer, tx, {
        answerId: p.answerId,
        actorId: userId,
      });
      if (result.changed) {
        await publishToTopic(tx, `question:${result.questionId}`, 'answer.accepted', {
          questionId: result.questionId,
          answerId: p.answerId,
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
    }),
  };

  private definitions(): ActionDefinition<never>[] {
    return [
      this.questionCreate,
      this.questionUpdate,
      this.answerCreate,
      this.answerUpdate,
      this.answerVote,
      this.answerAccept,
    ] as unknown as ActionDefinition<never>[];
  }
}
