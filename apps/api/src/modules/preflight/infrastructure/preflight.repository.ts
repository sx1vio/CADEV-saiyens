import { Inject, Injectable } from '@nestjs/common';
import type { PreflightListItem, PreflightReport } from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { PreflightStore } from '../application/run-preflight';
import { fixesOf } from '../domain/fixes';
import { labelDomain } from '../domain/label-domain';
import { recetteOf } from '../domain/recette';

type Stored = Pick<PreflightReport, 'checks' | 'metrics' | 'repoSummary' | 'counts'> &
  Partial<Pick<PreflightReport, 'lighthouse' | 'loadTest' | 'systalink' | 'architecture'>> & {
    owned?: boolean;
  };

@Injectable()
export class PreflightRepository implements PreflightStore {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

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
    const base = {
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
      architecture: result.architecture ?? null,
      checks: result.checks,
      author: { handle: r.user.handle, displayName: r.user.displayName },
    };
    // Lecture « recette » et correctifs recalculés à chaque lecture : ils valent aussi pour les
    // anciens rapports.
    const fixes = fixesOf(base, { apiOrigin: new URL(this.env.APP_URL).origin, now: r.createdAt });
    return {
      ...base,
      recette: recetteOf(base),
      fixes,
      label: await this.labelOf(r.id, r.url, result),
    };
  }

  /** Ce que le rapport dit du label « DevHub Ready » de son domaine. */
  private async labelOf(id: string, url: string | null, result: Stored) {
    const domain = url ? labelDomain(url) : null;
    if (!domain) return null;
    const current = await this.prisma.preflightLabel.findUnique({
      where: { domain },
      select: { reportId: true, decision: true },
    });
    return {
      domain,
      owned: result.owned === true,
      ready: current?.reportId === id && current.decision === 'go',
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
