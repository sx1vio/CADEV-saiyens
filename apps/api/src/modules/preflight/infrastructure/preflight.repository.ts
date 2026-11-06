import { Injectable } from '@nestjs/common';
import type { PreflightListItem, PreflightReport } from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { PreflightStore } from '../application/run-preflight';

type Stored = Pick<PreflightReport, 'checks' | 'metrics' | 'repoSummary' | 'counts'> &
  Partial<Pick<PreflightReport, 'lighthouse' | 'loadTest' | 'systalink'>>;

@Injectable()
export class PreflightRepository implements PreflightStore {
  constructor(private readonly prisma: PrismaService) {}

  countSince(userId: string, since: Date): Promise<number> {
    return this.prisma.preflightReport.count({ where: { userId, createdAt: { gte: since } } });
  }

  async save(input: Parameters<PreflightStore['save']>[0]): Promise<string> {
    const row = await this.prisma.preflightReport.create({
      data: {
        userId: input.userId,
        url: input.url,
        repo: input.repo,
        score: input.score,
        verdict: input.verdict,
        durationMs: input.durationMs,
        result: input.result as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return row.id;
  }

  async get(id: string): Promise<PreflightReport | null> {
    const r = await this.prisma.preflightReport.findUnique({
      where: { id },
      include: { user: { select: { handle: true, displayName: true } } },
    });
    if (!r) return null;
    const result = r.result as unknown as Stored;
    return {
      id: r.id,
      url: r.url,
      repo: r.repo,
      createdAt: r.createdAt.toISOString(),
      durationMs: r.durationMs,
      score: r.score,
      verdict: r.verdict as PreflightReport['verdict'],
      counts: result.counts,
      metrics: result.metrics,
      repoSummary: result.repoSummary,
      lighthouse: result.lighthouse ?? null,
      loadTest: result.loadTest ?? null,
      systalink: result.systalink ?? null,
      checks: result.checks,
      author: { handle: r.user.handle, displayName: r.user.displayName },
    };
  }

  async listMine(userId: string): Promise<PreflightListItem[]> {
    const rows = await this.prisma.preflightReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      url: r.url,
      repo: r.repo,
      createdAt: r.createdAt.toISOString(),
      score: r.score,
      verdict: r.verdict as PreflightReport['verdict'],
      counts: (r.result as unknown as Stored).counts,
    }));
  }
}
