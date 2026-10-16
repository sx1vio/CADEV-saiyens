import { Injectable } from '@nestjs/common';
import type { SystalinkService } from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { StatusStore } from '../domain/ports';
import type { DailyCount, ProbeResult, StoredCheck } from '../domain/status';

@Injectable()
export class PrismaStatusStore implements StatusStore {
  constructor(private readonly prisma: PrismaService) {}

  async record(results: ProbeResult[], at: Date): Promise<void> {
    await this.prisma.statusCheck.createMany({
      data: results.map((r) => ({
        service: r.service,
        ok: r.ok,
        latencyMs: r.latencyMs,
        detail: (r.detail ?? undefined) as Prisma.InputJsonValue | undefined,
        checkedAt: at,
      })),
    });
  }

  async purgeBefore(at: Date): Promise<number> {
    return (await this.prisma.statusCheck.deleteMany({ where: { checkedAt: { lt: at } } })).count;
  }

  /** Dernière sonde de chaque service (index service, checked_at desc). */
  async latest(): Promise<StoredCheck[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        service: string;
        ok: boolean;
        latency_ms: number | null;
        detail: StoredCheck['detail'];
        checked_at: Date;
      }>
    >`SELECT DISTINCT ON (service) service, ok, latency_ms, detail, checked_at
      FROM status_checks ORDER BY service, checked_at DESC`;
    return rows.map((r) => ({
      service: r.service as SystalinkService,
      ok: r.ok,
      latencyMs: r.latency_ms,
      detail: r.detail,
      checkedAt: r.checked_at,
    }));
  }

  async dailyCounts(since: Date): Promise<DailyCount[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ service: string; date: string; total: number; ok: number }>
    >`SELECT service, to_char(checked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS total, COUNT(*) FILTER (WHERE ok)::int AS ok
      FROM status_checks
      WHERE checked_at >= ${since}
        AND COALESCE((detail ->> 'configured')::boolean, true)
      GROUP BY service, date`;
    return rows.map((r) => ({ ...r, service: r.service as SystalinkService }));
  }
}
