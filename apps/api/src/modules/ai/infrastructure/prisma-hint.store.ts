import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AiRequestRecord, HintQuestion, HintStatus, HintStore } from '../domain/ports';
import { countModelCallsSince, recordAiRequest } from './ai-requests';

@Injectable()
export class PrismaHintStore implements HintStore {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestion(questionId: string): Promise<HintQuestion | null> {
    const q = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        authorId: true,
        title: true,
        body: true,
        codeSnippet: true,
        lang: true,
        aiStatus: true,
        hiddenAt: true,
        tags: { select: { tag: { select: { label: true } } } },
      },
    });
    // Une question retirée par la modération ne part pas à l'IA.
    if (!q || q.hiddenAt) return null;
    return {
      id: q.id,
      authorId: q.authorId,
      title: q.title,
      body: q.body,
      codeSnippet: q.codeSnippet,
      lang: q.lang,
      aiStatus: q.aiStatus,
      tags: q.tags.map((t) => t.tag.label),
    };
  }

  countModelCallsSince(userId: string, since: Date): Promise<number> {
    return countModelCallsSince(this.prisma, userId, since);
  }

  async findCachedHint(inputHash: string, promptVer: string): Promise<string | null> {
    const row = await this.prisma.aiRequest.findFirst({
      where: { kind: 'hint', inputHash, promptVer, status: 'ok' },
      orderBy: { createdAt: 'desc' },
      select: { output: true },
    });
    const output = row?.output as { hint?: unknown } | null | undefined;
    return typeof output?.hint === 'string' ? output.hint : null;
  }

  async saveHint(questionId: string, status: HintStatus, hint: string | null): Promise<boolean> {
    const { count } = await this.prisma.question.updateMany({
      where: { id: questionId, aiStatus: 'pending' },
      data: { aiStatus: status, aiHint: hint },
    });
    return count > 0;
  }

  recordRequest(record: AiRequestRecord): Promise<void> {
    return recordAiRequest(this.prisma, record);
  }
}
