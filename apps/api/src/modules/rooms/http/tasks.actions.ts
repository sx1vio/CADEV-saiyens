import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  type OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateTaskRequest, PostMessageRequest } from '@devhub/contracts';
import { z } from 'zod';
import {
  type ActionDefinition,
  ActionRegistry,
} from '../../../infrastructure/actions/action-registry';
import type { WriteResult } from '../../../infrastructure/idempotency/idempotency.service';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { publishToTopic } from '../../../infrastructure/realtime/realtime.publisher';
import { type IssueToImport, RoomMessages, Tasks } from '../application/tasks';
import { RoomNotFoundError } from '../domain/room';
import {
  NotRoomMemberError,
  NotTaskAssigneeError,
  type PullRef,
  TaskAlreadyTakenError,
  TaskInvalidStatusError,
  TaskNotFoundError,
  TaskPrInvalidError,
  type Verification,
} from '../domain/task';
import { PrismaMessageWriter, PrismaTaskWriter } from '../infrastructure/prisma-task.writer';
import { toHttp as roomErrors } from './rooms.actions';

/** Erreurs des tâches et de la discussion, puis celles des salles. */
export function toHttp(err: unknown): never {
  if (err instanceof TaskNotFoundError || err instanceof RoomNotFoundError) {
    throw new NotFoundException({ code: 'not_found', title: 'Task or room not found' });
  }
  if (err instanceof NotRoomMemberError) {
    throw new ForbiddenException({ code: 'room.not_member', title: 'Reserved to room members' });
  }
  if (err instanceof NotTaskAssigneeError) {
    throw new ForbiddenException({
      code: 'forbidden',
      title: 'Only the assignee can submit this task',
    });
  }
  if (err instanceof TaskAlreadyTakenError) {
    throw new ConflictException({ code: 'task.already_taken', title: 'Task already taken' });
  }
  if (err instanceof TaskInvalidStatusError) {
    throw new ConflictException({
      code: 'task.invalid_status',
      title: 'Not possible in the current task status',
    });
  }
  if (err instanceof TaskPrInvalidError) {
    throw new UnprocessableEntityException({
      code: 'task.pr_invalid',
      title: 'The pull request must belong to the repository of the room',
    });
  }
  return roomErrors(err);
}

const id = z.uuid();
const TaskCreate = CreateTaskRequest.extend({ roomId: id });
const TaskTarget = z.object({ taskId: id });
const Submit = z.object({ taskId: id, prUrl: z.string() });
const Complete = z.object({ taskId: id, prUrl: z.string().nullish() });
const Import = z.object({ roomId: id });
const MessageCreate = PostMessageRequest.extend({ roomId: id });

// Champs calculés hors transaction (lectures GitHub), jamais fournis par le client.
const pullRef = z.custom<PullRef | null>();
const ImportPayload = Import.extend({ issues: z.array(z.custom<IssueToImport>()) });
const SubmitPayload = Submit.extend({ pull: pullRef });
const CompletePayloadSchema = Complete.extend({
  pull: pullRef,
  verification: z.custom<Verification>(),
  unavailable: z.boolean(),
});
export type CompletePayload = z.infer<typeof CompletePayloadSchema>;

const task = (taskId: string, roomId: string) => ({ taskId, roomId });

/** Écritures des tâches (R2, R8, R9) et de la discussion (R4). */
@Injectable()
export class TasksActions implements OnModuleInit {
  constructor(
    private readonly registry: ActionRegistry,
    private readonly tasks: Tasks,
    private readonly messages: RoomMessages,
    private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.taskTake);
    this.registry.register(this.messageCreate);
  }

  readonly taskCreate: ActionDefinition<z.infer<typeof TaskCreate>> = {
    type: 'task.create',
    schema: TaskCreate,
    endpoint: (p) => `POST /rooms/${p.roomId}/tasks`,
    body: ({ roomId: _r, ...rest }) => rest,
    execute: async (tx, userId, p): Promise<WriteResult<{ id: string }>> => {
      try {
        const created = await this.tasks.create(new PrismaTaskWriter(tx), {
          roomId: p.roomId,
          actorId: userId,
          title: p.title,
          description: p.description ?? null,
          level: p.level,
        });
        await publishToTopic(tx, `room:${p.roomId}`, 'task.updated', task(created.id, p.roomId));
        return { status: HttpStatus.CREATED, body: created };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  /** Les issues sont lues hors transaction ; seul l'identifiant de salle est haché. */
  readonly importIssues: ActionDefinition<z.infer<typeof ImportPayload>> = {
    type: 'task.import_issues',
    schema: ImportPayload,
    endpoint: (p) => `POST /rooms/${p.roomId}/tasks/import-issues`,
    body: () => ({}),
    execute: async (tx, userId, p): Promise<WriteResult<{ ids: string[]; skipped: number }>> => {
      try {
        const out = await this.tasks.importIssues(new PrismaTaskWriter(tx), {
          roomId: p.roomId,
          actorId: userId,
          issues: p.issues,
        });
        if (out.ids.length > 0)
          await publishToTopic(tx, `room:${p.roomId}`, 'task.updated', { roomId: p.roomId });
        return { status: HttpStatus.OK, body: out };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  readonly taskTake: ActionDefinition<z.infer<typeof TaskTarget>> = {
    type: 'task.take',
    schema: TaskTarget,
    endpoint: (p) => `POST /tasks/${p.taskId}/take`,
    body: () => ({}),
    execute: async (tx, userId, p): Promise<WriteResult<{ id: string }>> => {
      try {
        const { roomId } = await this.tasks.take(new PrismaTaskWriter(tx), {
          taskId: p.taskId,
          actorId: userId,
        });
        await publishToTopic(tx, `room:${roomId}`, 'task.updated', task(p.taskId, roomId));
        return { status: HttpStatus.OK, body: { id: p.taskId } };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  readonly taskSubmit: ActionDefinition<z.infer<typeof SubmitPayload>> = {
    type: 'task.submit',
    schema: SubmitPayload,
    endpoint: (p) => `POST /tasks/${p.taskId}/submit`,
    body: ({ prUrl }) => ({ prUrl }),
    execute: async (tx, userId, p): Promise<WriteResult<{ id: string }>> => {
      try {
        const { roomId } = await this.tasks.submit(new PrismaTaskWriter(tx), {
          taskId: p.taskId,
          actorId: userId,
          prUrl: p.prUrl,
          pull: p.pull,
        });
        await publishToTopic(tx, `room:${roomId}`, 'task.updated', task(p.taskId, roomId));
        return { status: HttpStatus.OK, body: { id: p.taskId } };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  /** La vérification GitHub est faite hors transaction ; seul le lien de PR est haché. */
  readonly taskComplete: ActionDefinition<CompletePayload> = {
    type: 'task.complete',
    schema: CompletePayloadSchema,
    endpoint: (p) => `POST /tasks/${p.taskId}/complete`,
    body: ({ prUrl }) => ({ prUrl: prUrl ?? null }),
    execute: async (
      tx,
      userId,
      p,
    ): Promise<
      WriteResult<{ id: string; points: number; withheld: Array<{ kind: string; reason: string }> }>
    > => {
      try {
        const out = await this.tasks.complete(new PrismaTaskWriter(tx), tx, {
          taskId: p.taskId,
          actorId: userId,
          prUrl: p.prUrl ?? null,
          pull: p.pull,
          verification: p.verification,
        });
        await publishToTopic(tx, `room:${out.roomId}`, 'task.updated', task(p.taskId, out.roomId));
        return {
          status: HttpStatus.OK,
          body: { id: p.taskId, points: out.points, withheld: out.withheld },
          // GitHub ne répondait pas : la contribution reste « déclarée » jusqu'au nouvel essai (R9).
          afterCommit: p.unavailable
            ? () =>
                this.jobs.send(JOBS.githubVerifyPr, { taskId: p.taskId, actorId: userId }, p.taskId)
            : undefined,
        };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  readonly messageCreate: ActionDefinition<z.infer<typeof MessageCreate>> = {
    type: 'room_message.create',
    schema: MessageCreate,
    endpoint: (p) => `POST /rooms/${p.roomId}/messages`,
    body: ({ roomId: _r, ...rest }) => rest,
    execute: async (tx, userId, p): Promise<WriteResult<{ id: string }>> => {
      try {
        const { id: messageId, created } = await this.messages.post(new PrismaMessageWriter(tx), {
          roomId: p.roomId,
          authorId: userId,
          clientId: p.clientId,
          kind: p.kind,
          body: p.body,
        });
        if (created) {
          await publishToTopic(tx, `room:${p.roomId}`, 'room_message.created', {
            roomId: p.roomId,
            messageId,
          });
        }
        return { status: created ? HttpStatus.CREATED : HttpStatus.OK, body: { id: messageId } };
      } catch (err) {
        return toHttp(err);
      }
    },
  };
}
