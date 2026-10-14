import {
  Body,
  Controller,
  ForbiddenException,
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
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import {
  CompleteTaskRequest,
  CompleteTaskResponse,
  CreateTaskRequest,
  ImportIssuesResponse,
  ListMessagesQuery,
  ListMessagesResponse,
  ListTasksResponse,
  MessageView,
  PostMessageRequest,
  SubmitTaskRequest,
  TaskView,
} from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { runAction } from '../../../infrastructure/actions/action-registry';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { parsePullUrl } from '../../github';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { GithubPrVerifier } from '../infrastructure/github-pr.verifier';
import { RoomReader } from '../infrastructure/room.reader';
import { TasksActions, toHttp } from './tasks.actions';

class CreateTaskRequestDto extends createZodDto(CreateTaskRequest) {}
class TaskViewDto extends createZodDto(TaskView) {}
class ListTasksResponseDto extends createZodDto(ListTasksResponse) {}
class ImportIssuesResponseDto extends createZodDto(ImportIssuesResponse) {}
class SubmitTaskRequestDto extends createZodDto(SubmitTaskRequest) {}
class CompleteTaskRequestDto extends createZodDto(CompleteTaskRequest) {}
class CompleteTaskResponseDto extends createZodDto(CompleteTaskResponse) {}
class PostMessageRequestDto extends createZodDto(PostMessageRequest) {}
class MessageViewDto extends createZodDto(MessageView) {}
class ListMessagesQueryDto extends createZodDto(ListMessagesQuery) {}
class ListMessagesResponseDto extends createZodDto(ListMessagesResponse) {}

const notFound = () =>
  new NotFoundException({ code: 'not_found', title: 'Task or room not found' });

@Controller('api/v1')
export class TasksController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly reader: RoomReader,
    private readonly actions: TasksActions,
    private readonly github: GithubPrVerifier,
  ) {}

  private replayed(res: Response, outcome: { replayed: boolean; status: number }) {
    res.status(outcome.status);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
  }

  private async taskOr404(taskId: string): Promise<TaskView> {
    const task = await this.reader.task(taskId);
    if (!task || task.roomHidden) throw notFound();
    const { roomHidden: _h, ...view } = task;
    return view;
  }

  /** R2 : tâches d'une salle, publiques comme la salle. */
  @Get('rooms/:id/tasks')
  @ApiOkResponse({ type: ListTasksResponseDto })
  async list(@Param('id', ParseUUIDPipe) roomId: string): Promise<ListTasksResponse> {
    const room = await this.reader.roomRepo(roomId);
    if (!room || room.hiddenAt) throw notFound();
    return { data: await this.reader.tasks(roomId) };
  }

  /** R2 : créer une tâche (membres). */
  @Post('rooms/:id/tasks')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: TaskViewDto })
  async create(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) roomId: string,
    @Body() body: CreateTaskRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TaskView> {
    const outcome = await runAction(this.idempotency, this.actions.taskCreate, auth.userId, key, {
      ...body,
      roomId,
    });
    this.replayed(res, outcome);
    return this.taskOr404((outcome.body as { id: string }).id);
  }

  /** R2 : importer les issues ouvertes du dépôt (créateur) ; chaque issue une seule fois. */
  @Post('rooms/:id/tasks/import-issues')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: ImportIssuesResponseDto })
  async importIssues(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) roomId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ImportIssuesResponse> {
    const room = await this.reader.roomRepo(roomId);
    if (!room || room.hiddenAt) throw notFound();
    if (!room.repoFullName) {
      throw new UnprocessableEntityException({
        code: 'room.repo_not_found',
        title: 'This room has no repository',
      });
    }
    if (!(await this.reader.roleOf(roomId, auth.userId))) {
      throw new ForbiddenException({ code: 'room.not_member', title: 'Reserved to room members' });
    }
    const issues = await this.github.openIssues(auth.userId, room.repoFullName).catch(toHttp);
    const outcome = await runAction(this.idempotency, this.actions.importIssues, auth.userId, key, {
      roomId,
      issues,
    });
    this.replayed(res, outcome);
    const { ids, skipped } = outcome.body as { ids: string[]; skipped: number };
    const tasks = await this.reader.tasks(roomId);
    return { imported: ids.length, skipped, data: tasks.filter((t) => ids.includes(t.id)) };
  }

  /** R2 : prendre une tâche ouverte (membres) ; disponible aussi hors ligne. */
  @Post('tasks/:id/take')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: TaskViewDto })
  async take(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) taskId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TaskView> {
    const outcome = await runAction(this.idempotency, this.actions.taskTake, auth.userId, key, {
      taskId,
    });
    this.replayed(res, outcome);
    return this.taskOr404(taskId);
  }

  /** R2 : l'assigné passe la tâche en revue avec sa PR (du dépôt de la salle). */
  @Post('tasks/:id/submit')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: TaskViewDto })
  async submit(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() body: SubmitTaskRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TaskView> {
    const outcome = await runAction(this.idempotency, this.actions.taskSubmit, auth.userId, key, {
      taskId,
      prUrl: body.prUrl,
      pull: parsePullUrl(body.prUrl),
    });
    this.replayed(res, outcome);
    return this.taskOr404(taskId);
  }

  /** R8, R9 : le créateur clôt la tâche ; +15 XP ; contribution vérifiée par GitHub si possible. */
  @Post('tasks/:id/complete')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: CompleteTaskResponseDto })
  async complete(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() body: CompleteTaskRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CompleteTaskResponse> {
    const current = await this.taskOr404(taskId);
    const ref = await this.reader.roomOfTask(taskId);
    // Lecture de la PR sur GitHub hors transaction (jusqu'à 10 s).
    const check = await this.github.check(
      auth.userId,
      body.prUrl ?? current.prUrl,
      ref?.assigneeId ?? null,
    );
    const outcome = await runAction(this.idempotency, this.actions.taskComplete, auth.userId, key, {
      taskId,
      prUrl: body.prUrl ?? null,
      pull: body.prUrl ? parsePullUrl(body.prUrl) : null,
      verification: check.verification,
      unavailable: check.unavailable,
    });
    this.replayed(res, outcome);
    const result = outcome.body as {
      points: number;
      withheld: Array<{ kind: string; reason: string }>;
    };
    return { task: await this.taskOr404(taskId), points: result.points, withheld: result.withheld };
  }

  /** R4 : discussion de la salle, réservée aux membres. */
  @Get('rooms/:id/messages')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ListMessagesResponseDto })
  async messages(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) roomId: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<ListMessagesResponse> {
    if (!(await this.reader.roleOf(roomId, auth.userId))) {
      throw new ForbiddenException({ code: 'room.not_member', title: 'Reserved to room members' });
    }
    return this.reader.messages(roomId, query);
  }

  /** R4 : écrire dans la discussion (membres) ; rédigeable hors ligne. */
  @Post('rooms/:id/messages')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: MessageViewDto })
  async post(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) roomId: string,
    @Body() body: PostMessageRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageView> {
    const outcome = await runAction(
      this.idempotency,
      this.actions.messageCreate,
      auth.userId,
      key,
      { ...body, roomId },
    );
    this.replayed(res, outcome);
    const message = await this.reader.message((outcome.body as { id: string }).id);
    if (!message) throw notFound();
    return message;
  }
}
