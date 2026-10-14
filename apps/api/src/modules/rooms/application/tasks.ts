import { maskSecrets } from '@devhub/core';
import type { MessageWriter, TaskNotifier, TaskReputationPort, TaskWriter } from '../domain/ports';
import { RoomNotFoundError, canManage } from '../domain/room';
import {
  NotRoomMemberError,
  type PullRef,
  TaskNotFoundError,
  type Verification,
  assertCanComplete,
  assertCanSubmit,
  assertPrInRepo,
  decideTake,
} from '../domain/task';

export interface IssueToImport {
  id: bigint;
  number: number;
  title: string;
  body: string | null;
  labels: string[];
}

/** Niveau déduit des étiquettes de l'issue (« good first issue » → premier pas). */
export function levelFromLabels(labels: string[]): 'first_step' | 'easy' | 'medium' | 'hard' {
  const l = labels.map((x) => x.toLowerCase());
  if (l.some((x) => x.includes('good first issue') || x.includes('first-timers')))
    return 'first_step';
  if (l.some((x) => x === 'easy' || x.includes('beginner'))) return 'easy';
  if (l.some((x) => x === 'hard' || x.includes('complex'))) return 'hard';
  return 'medium';
}

/**
 * R2, R8, R9 : tâches d'une salle. La vérification GitHub d'une PR (appel réseau) est faite
 * hors transaction par l'appelant et transmise ici ; les XP et la notification suivent la
 * clôture dans la même transaction.
 */
export class Tasks {
  constructor(
    private readonly reputation: TaskReputationPort,
    private readonly notifier: TaskNotifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async memberRoom(writer: TaskWriter, roomId: string, actorId: string) {
    const room = await writer.findRoom(roomId);
    if (!room || room.hidden) throw new RoomNotFoundError();
    const role = await writer.roleOf(room.id, actorId);
    return { room, role };
  }

  async create(
    writer: TaskWriter,
    input: {
      roomId: string;
      actorId: string;
      title: string;
      description: string | null;
      level: 'first_step' | 'easy' | 'medium' | 'hard';
    },
  ): Promise<{ id: string }> {
    const { room, role } = await this.memberRoom(writer, input.roomId, input.actorId);
    if (!role) throw new NotRoomMemberError();
    const task = await writer.createTask({
      roomId: room.id,
      title: input.title,
      description: input.description,
      level: input.level,
    });
    await writer.touch(room.id, this.now());
    return task;
  }

  /** R2 : importe les issues ouvertes (lues hors transaction) ; une issue n'est importée qu'une fois. */
  async importIssues(
    writer: TaskWriter,
    input: { roomId: string; actorId: string; issues: IssueToImport[] },
  ): Promise<{ ids: string[]; skipped: number }> {
    const { room, role } = await this.memberRoom(writer, input.roomId, input.actorId);
    if (!canManage(role)) throw new NotRoomMemberError();
    const already = await writer.importedIssueIds(room.id);
    const ids: string[] = [];
    for (const issue of input.issues) {
      if (already.has(issue.id)) continue;
      const task = await writer.createTask({
        roomId: room.id,
        title: issue.title.slice(0, 150),
        description: issue.body ? maskSecrets(issue.body.slice(0, 5_000)).text : null,
        level: levelFromLabels(issue.labels),
        githubIssueId: issue.id,
      });
      ids.push(task.id);
    }
    if (ids.length > 0) await writer.touch(room.id, this.now());
    return { ids, skipped: input.issues.length - ids.length };
  }

  async take(
    writer: TaskWriter,
    input: { taskId: string; actorId: string },
  ): Promise<{ roomId: string }> {
    const task = await writer.lockTask(input.taskId);
    if (!task) throw new TaskNotFoundError();
    const { room, role } = await this.memberRoom(writer, task.roomId, input.actorId);
    if (decideTake(task, input.actorId, role) === 'take') {
      await writer.take(task.id, input.actorId, this.now());
      await writer.touch(room.id, this.now());
    }
    return { roomId: room.id };
  }

  async submit(
    writer: TaskWriter,
    input: { taskId: string; actorId: string; prUrl: string; pull: PullRef | null },
  ): Promise<{ roomId: string }> {
    const task = await writer.lockTask(input.taskId);
    if (!task) throw new TaskNotFoundError();
    const { room } = await this.memberRoom(writer, task.roomId, input.actorId);
    assertCanSubmit(task, input.actorId);
    assertPrInRepo(input.pull, room.repoFullName);
    await writer.submit(task.id, input.prUrl);
    await writer.touch(room.id, this.now());
    return { roomId: room.id };
  }

  /**
   * R8 : clôture par le créateur. +15 XP au contributeur dans la même transaction (retenus si le
   * créateur clôt sa propre tâche), et notification. `verification` vient de GitHub (R9).
   */
  async complete(
    writer: TaskWriter,
    tx: unknown,
    input: {
      taskId: string;
      actorId: string;
      prUrl: string | null;
      pull: PullRef | null;
      verification: Verification;
      /** PR et assigné réellement vérifiés hors transaction (pour écarter un état changé entre-temps). */
      checked: { prUrl: string | null; assigneeId: string | null };
    },
  ): Promise<{
    roomId: string;
    points: number;
    withheld: Array<{ kind: string; reason: string }>;
    /** La vérification ne portait plus sur l'état final : à refaire en tâche de fond. */
    recheck: boolean;
  }> {
    const task = await writer.lockTask(input.taskId);
    if (!task) throw new TaskNotFoundError();
    const { room, role } = await this.memberRoom(writer, task.roomId, input.actorId);
    assertCanComplete(task, role);
    const prUrl = input.prUrl ?? task.prUrl;
    if (input.prUrl) assertPrInRepo(input.pull, room.repoFullName);

    // Entre la lecture GitHub et le verrou, la PR ou l'assigné ont pu changer : on ne garde
    // « Vérifié par GitHub » que si la vérification porte exactement sur l'état enregistré.
    const stale = prUrl !== input.checked.prUrl || task.assigneeId !== input.checked.assigneeId;
    const verification = stale ? 'declared' : input.verification;
    const now = this.now();
    await writer.complete(task.id, prUrl, verification, now);
    await writer.touch(room.id, now);
    const xp = await this.reputation.taskCompleted(
      {
        taskId: task.id,
        contributorId: task.assigneeId!,
        ownerId: room.ownerId,
        tagIds: room.stackTagIds,
      },
      tx,
    );
    const points = xp.events
      .filter((e) => e.userId === task.assigneeId)
      .reduce((s, e) => s + e.points, 0);
    if (task.assigneeId !== input.actorId) {
      await this.notifier.notify(
        [
          {
            userId: task.assigneeId!,
            type: 'task.completed',
            payload: { roomId: room.id, taskId: task.id, points, verification },
          },
        ],
        tx,
      );
    }
    return {
      roomId: room.id,
      points,
      withheld: xp.withheld.map((w) => ({ kind: w.kind, reason: w.reason })),
      recheck: stale && prUrl !== null,
    };
  }
}

/** R4 : discussion d'une salle, réservée aux membres ; rédigeable hors ligne (clientId). */
export class RoomMessages {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async post(
    writer: MessageWriter,
    input: {
      roomId: string;
      authorId: string;
      clientId: string;
      kind: 'text' | 'standup';
      body: string;
    },
  ): Promise<{ id: string; created: boolean }> {
    const room = await writer.findRoom(input.roomId);
    if (!room || room.hidden) throw new RoomNotFoundError();
    if (!(await writer.roleOf(room.id, input.authorId))) throw new NotRoomMemberError();
    await writer.lockAuthor(input.authorId);
    const existing = await writer.findByClientId(input.authorId, input.clientId);
    if (existing) return { id: existing.id, created: false };
    const message = await writer.create({ ...input, body: maskSecrets(input.body).text });
    await writer.touch(room.id, this.now());
    return { id: message.id, created: true };
  }
}
