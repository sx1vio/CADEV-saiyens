import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AiRequestRecord, RoomTaskSuggestion, RoomTasksStore } from '../domain/ports';
import { MODEL_CALL_STATUSES, PrismaHintStore } from './prisma-hint.store';

type RoomTasksRecord = AiRequestRecord<{ tasks: RoomTaskSuggestion[] }>;

/** ai_requests pour R5 : même quota et même journal que la piste IA, cache propre à room_tasks. */
@Injectable()
export class PrismaRoomTasksStore implements RoomTasksStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: PrismaHintStore,
  ) {}

  async findCachedTasks(
    inputHash: string,
    promptVer: string,
  ): Promise<RoomTaskSuggestion[] | null> {
    const row = await this.prisma.aiRequest.findFirst({
      where: { kind: 'room_tasks', inputHash, promptVer, status: 'ok' },
      orderBy: { createdAt: 'desc' },
      select: { output: true },
    });
    const output = row?.output as { tasks?: unknown } | null | undefined;
    return Array.isArray(output?.tasks) ? (output.tasks as RoomTaskSuggestion[]) : null;
  }

  recordRequest(record: RoomTasksRecord): Promise<void> {
    return this.requests.recordRequest(record);
  }

  /**
   * Compte et réserve dans une même transaction courte, sous un verrou consultatif propre à
   * l'utilisateur : deux requêtes simultanées du même compte passent l'une après l'autre.
   */
  reserveModelCall(
    base: Pick<RoomTasksRecord, 'userId' | 'kind' | 'inputHash' | 'promptVer'>,
    since: Date,
    quota: number,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ai_quota'), hashtext(${base.userId}))`;
      const used = await tx.aiRequest.count({
        where: {
          userId: base.userId,
          createdAt: { gte: since },
          status: { in: MODEL_CALL_STATUSES },
        },
      });
      if (used >= quota) return null;
      const row = await tx.aiRequest.create({
        data: { ...base, status: 'pending' },
        select: { id: true },
      });
      return row.id;
    });
  }

  async finishModelCall(
    id: string,
    result: Omit<RoomTasksRecord, 'userId' | 'kind' | 'inputHash' | 'promptVer'>,
  ): Promise<void> {
    await this.prisma.aiRequest.update({
      where: { id },
      data: {
        status: result.status,
        output: (result.output ?? undefined) as Prisma.InputJsonValue | undefined,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      },
    });
  }

  async releaseModelCall(id: string): Promise<void> {
    await this.prisma.aiRequest.deleteMany({ where: { id, status: 'pending' } });
  }
}
