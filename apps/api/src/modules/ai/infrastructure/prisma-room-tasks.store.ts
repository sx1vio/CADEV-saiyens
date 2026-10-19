import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AiRequestRecord, RoomTaskSuggestion, RoomTasksStore } from '../domain/ports';
import { PrismaHintStore } from './prisma-hint.store';

/** ai_requests pour R5 : même quota et même journal que la piste IA, cache propre à room_tasks. */
@Injectable()
export class PrismaRoomTasksStore implements RoomTasksStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: PrismaHintStore,
  ) {}

  countModelCallsSince(userId: string, since: Date): Promise<number> {
    return this.requests.countModelCallsSince(userId, since);
  }

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

  recordRequest(record: AiRequestRecord<{ tasks: RoomTaskSuggestion[] }>): Promise<void> {
    return this.requests.recordRequest(record);
  }
}
