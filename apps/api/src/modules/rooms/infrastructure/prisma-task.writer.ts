import type { Tx } from '../../../infrastructure/idempotency/idempotency.service';
import type { MessageWriter, TaskRoom, TaskWriter } from '../domain/ports';
import type { RoomRole } from '../domain/room';
import type { TaskState } from '../domain/task';

const roomSelect = {
  id: true,
  ownerId: true,
  name: true,
  repoFullName: true,
  stackTagIds: true,
  hiddenAt: true,
} as const;

async function findRoom(tx: Tx, roomId: string): Promise<TaskRoom | null> {
  const r = await tx.room.findUnique({ where: { id: roomId }, select: roomSelect });
  return r
    ? {
        id: r.id,
        ownerId: r.ownerId,
        name: r.name,
        repoFullName: r.repoFullName,
        stackTagIds: r.stackTagIds,
        hidden: r.hiddenAt !== null,
      }
    : null;
}

async function roleOf(tx: Tx, roomId: string, userId: string): Promise<RoomRole | null> {
  const m = await tx.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

async function touch(tx: Tx, roomId: string, at: Date): Promise<void> {
  await tx.room.update({ where: { id: roomId }, data: { lastActivityAt: at } });
}

/** Écritures des tâches (R2, R8), dans la transaction de la requête. */
export class PrismaTaskWriter implements TaskWriter {
  constructor(private readonly tx: Tx) {}

  findRoom(roomId: string) {
    return findRoom(this.tx, roomId);
  }

  roleOf(roomId: string, userId: string) {
    return roleOf(this.tx, roomId, userId);
  }

  async lockTask(taskId: string): Promise<TaskState | null> {
    await this.tx.$queryRaw`SELECT id FROM tasks WHERE id = ${taskId}::uuid FOR UPDATE`;
    return this.tx.task.findUnique({
      where: { id: taskId },
      select: { id: true, roomId: true, title: true, status: true, assigneeId: true, prUrl: true },
    });
  }

  createTask(t: {
    roomId: string;
    title: string;
    description: string | null;
    level: 'first_step' | 'easy' | 'medium' | 'hard';
    githubIssueId?: bigint;
  }): Promise<{ id: string }> {
    return this.tx.task.create({ data: t, select: { id: true } });
  }

  async importedIssueIds(roomId: string): Promise<Set<bigint>> {
    const rows = await this.tx.task.findMany({
      where: { roomId, githubIssueId: { not: null } },
      select: { githubIssueId: true },
    });
    return new Set(rows.map((r) => r.githubIssueId!));
  }

  async take(taskId: string, userId: string, at: Date): Promise<void> {
    await this.tx.task.update({
      where: { id: taskId },
      data: { status: 'taken', assigneeId: userId, takenAt: at, version: { increment: 1 } },
    });
  }

  async submit(taskId: string, prUrl: string): Promise<void> {
    await this.tx.task.update({
      where: { id: taskId },
      data: { status: 'in_review', prUrl, version: { increment: 1 } },
    });
  }

  async complete(
    taskId: string,
    prUrl: string | null,
    verification: 'github_verified' | 'declared',
    at: Date,
  ): Promise<void> {
    await this.tx.task.update({
      where: { id: taskId },
      data: { status: 'done', prUrl, verification, completedAt: at, version: { increment: 1 } },
    });
  }

  touch(roomId: string, at: Date) {
    return touch(this.tx, roomId, at);
  }
}

/** Écritures de la discussion (R4), dans la transaction de la requête. */
export class PrismaMessageWriter implements MessageWriter {
  constructor(private readonly tx: Tx) {}

  findRoom(roomId: string) {
    return findRoom(this.tx, roomId);
  }

  roleOf(roomId: string, userId: string) {
    return roleOf(this.tx, roomId, userId);
  }

  async lockAuthor(authorId: string): Promise<void> {
    await this.tx
      .$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${`rooms.message:${authorId}`}, 0))) AS l`;
  }

  findByClientId(authorId: string, clientId: string) {
    return this.tx.roomMessage.findUnique({
      where: { authorId_clientId: { authorId, clientId } },
      select: { id: true },
    });
  }

  create(m: {
    roomId: string;
    authorId: string;
    clientId: string;
    kind: 'text' | 'standup';
    body: string;
  }) {
    return this.tx.roomMessage.create({ data: m, select: { id: true } });
  }

  touch(roomId: string, at: Date) {
    return touch(this.tx, roomId, at);
  }
}
