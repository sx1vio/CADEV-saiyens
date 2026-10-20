import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  AiRequestRecord,
  ModelCallBase,
  ModelCallResult,
  RoomTaskSuggestion,
  RoomTasksStore,
} from '../domain/ports';
import {
  finishModelCall,
  recordAiRequest,
  releaseModelCall,
  reserveModelCall,
} from './ai-requests';

type RoomTasksOutput = { tasks: RoomTaskSuggestion[] };

/**
 * ai_requests pour R5 : même quota et même journal que la piste IA et la traduction (module
 * partagé ai-requests.ts), cache propre à room_tasks.
 */
@Injectable()
export class PrismaRoomTasksStore implements RoomTasksStore {
  constructor(private readonly prisma: PrismaService) {}

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

  recordRequest(record: AiRequestRecord<RoomTasksOutput>): Promise<void> {
    return recordAiRequest(this.prisma, record);
  }

  reserveModelCall(base: ModelCallBase, since: Date, quota: number): Promise<string | null> {
    return reserveModelCall(this.prisma, base, since, quota);
  }

  finishModelCall(id: string, result: ModelCallResult<RoomTasksOutput>): Promise<void> {
    return finishModelCall(this.prisma, id, result);
  }

  releaseModelCall(id: string): Promise<void> {
    return releaseModelCall(this.prisma, id);
  }
}
