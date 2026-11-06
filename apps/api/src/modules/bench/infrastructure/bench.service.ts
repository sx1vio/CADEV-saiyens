import { Injectable } from '@nestjs/common';
import type {
  BenchDetail,
  BenchDevice,
  BenchFinding,
  BenchItem,
  BenchNetwork,
  BenchReportView,
  CreateBenchReport,
  CreateBenchRequest,
  ListBenchQuery,
  ListBenchResponse,
  ReviewBenchReportResponse,
} from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Notifier } from '../../notifications';
import { AwardXp } from '../../reputation';
import { assertCanReport, assertCanReview, coverage } from '../domain/rules';

const author = { select: { handle: true, displayName: true, avatarUrl: true, isDemo: true } };

const itemSelect = {
  id: true,
  authorId: true,
  title: true,
  appUrl: true,
  repoUrl: true,
  devices: true,
  networks: true,
  maxTesters: true,
  status: true,
  createdAt: true,
  author,
} satisfies Prisma.BenchRequestSelect;

type ItemRow = Prisma.BenchRequestGetPayload<{ select: typeof itemSelect }>;

/** Demandes visibles : ni masquées par la modération, ni d'un compte supprimé ou suspendu. */
const visible = {
  hiddenAt: null,
  author: { deletedAt: null, suspendedAt: null },
} satisfies Prisma.BenchRequestWhereInput;

// Banc d'essai : demandes de test sur de vrais appareils, rapports des testeurs, Proof XP.
@Injectable()
export class BenchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: AwardXp,
    private readonly notifier: Notifier,
  ) {}

  async list(q: ListBenchQuery, viewer: string | null): Promise<ListBenchResponse> {
    const where: Prisma.BenchRequestWhereInput = { ...visible };
    if (q.scope === 'mine') {
      if (!viewer) return { data: [], stats: await this.stats() };
      where.authorId = viewer;
    } else if (q.scope === 'tested') {
      if (!viewer) return { data: [], stats: await this.stats() };
      where.reports = { some: { testerId: viewer } };
    } else {
      where.status = 'open';
    }
    if (q.device) where.devices = { has: q.device };
    if (q.network) where.networks = { has: q.network };
    const rows = await this.prisma.benchRequest.findMany({
      where,
      select: itemSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 60,
    });
    return { data: await this.items(rows, viewer), stats: await this.stats() };
  }

  async detail(id: string, viewer: string | null): Promise<BenchDetail | null> {
    const row = await this.prisma.benchRequest.findFirst({
      where: { id, ...visible },
      select: { ...itemSelect, instructions: true },
    });
    if (!row) return null;
    const reports = await this.prisma.benchReport.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'asc' },
      include: { tester: author },
    });
    const isAuthor = viewer === row.authorId;
    // Les rapports peuvent décrire une faille : le demandeur voit tout, un testeur voit le sien.
    const readable = reports.filter((r) => isAuthor || r.testerId === viewer);
    const points = await this.pointsFor(readable.map((r) => r.id));
    const [item] = await this.items([row], viewer);
    return {
      ...item!,
      instructions: row.instructions,
      coverage: coverage(reports),
      reports: readable.map((r) => this.reportView(r, points.get(r.id) ?? 0)),
    };
  }

  async create(input: CreateBenchRequest, authorId: string): Promise<{ id: string }> {
    const row = await this.prisma.benchRequest.create({
      data: {
        authorId,
        title: input.title,
        appUrl: input.appUrl,
        repoUrl: input.repoUrl,
        instructions: input.instructions,
        devices: [...new Set(input.devices)],
        networks: [...new Set(input.networks)],
        maxTesters: input.maxTesters,
      },
      select: { id: true },
    });
    return row;
  }

  openCount(authorId: string): Promise<number> {
    return this.prisma.benchRequest.count({ where: { authorId, status: 'open', hiddenAt: null } });
  }

  reportsSince(testerId: string, since: Date): Promise<number> {
    return this.prisma.benchReport.count({ where: { testerId, createdAt: { gte: since } } });
  }

  /** Ferme ou rouvre une demande ; seul son auteur le peut. */
  async setStatus(id: string, authorId: string, status: 'open' | 'closed'): Promise<boolean> {
    const res = await this.prisma.benchRequest.updateMany({
      where: { id, authorId, hiddenAt: null },
      data: { status, closedAt: status === 'closed' ? new Date() : null },
    });
    return res.count > 0;
  }

  /** Rend un rapport ; la demande est verrouillée pour que deux testeurs ne prennent pas la même place. */
  async report(
    requestId: string,
    testerId: string,
    input: CreateBenchReport,
  ): Promise<{ id: string } | null> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{
          author_id: string;
          status: 'open' | 'closed';
          max_testers: number;
          devices: string[];
          networks: string[];
          title: string;
        }>
      >`SELECT author_id, status, max_testers, devices, networks, title
          FROM bench_requests WHERE id = ${requestId}::uuid AND hidden_at IS NULL FOR UPDATE`;
      const request = locked[0];
      if (!request) return null;
      const [activeReports, mine] = await Promise.all([
        tx.benchReport.count({ where: { requestId, status: { not: 'rejected' } } }),
        tx.benchReport.count({ where: { requestId, testerId } }),
      ]);
      assertCanReport(
        {
          authorId: request.author_id,
          status: request.status,
          maxTesters: request.max_testers,
          devices: request.devices,
          networks: request.networks,
        },
        {
          testerId,
          device: input.device,
          network: input.network,
          activeReports,
          alreadyReported: mine > 0,
        },
      );
      const created = await tx.benchReport.create({
        data: {
          requestId,
          testerId,
          device: input.device,
          model: input.model,
          os: input.os,
          browser: input.browser,
          network: input.network,
          country: input.country,
          verdict: input.verdict,
          findings: input.findings as Prisma.InputJsonValue,
          notes: input.notes,
        },
        select: { id: true },
      });
      const tester = await tx.user.findUnique({
        where: { id: testerId },
        select: { displayName: true },
      });
      await this.notifier.notify(
        [
          {
            userId: request.author_id,
            type: 'bench.report',
            payload: {
              benchId: requestId,
              title: request.title,
              by: tester?.displayName ?? '',
              verdict: input.verdict,
              findings: input.findings.length,
            },
          },
        ],
        tx,
      );
      return created;
    });
  }

  /** Le demandeur confirme (+8 XP au testeur, selon les garde-fous du barème) ou refuse un rapport. */
  async review(
    reportId: string,
    actorId: string,
    decision: 'confirm' | 'reject',
  ): Promise<ReviewBenchReportResponse | null> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM bench_reports WHERE id = ${reportId}::uuid FOR UPDATE`;
      if (!locked[0]) return null;
      const report = await tx.benchReport.findUniqueOrThrow({
        where: { id: reportId },
        include: { request: { select: { id: true, authorId: true, title: true, hiddenAt: true } } },
      });
      if (report.request.hiddenAt) return null;
      assertCanReview(report.request, report, actorId);
      const status = decision === 'confirm' ? 'confirmed' : 'rejected';
      await tx.benchReport.update({
        where: { id: reportId },
        data: { status, reviewedAt: new Date() },
      });
      let points = 0;
      let withheld: ReviewBenchReportResponse['withheld'] = [];
      if (status === 'confirmed') {
        const award = await this.xp.fieldTestConfirmed(
          { reportId, testerId: report.testerId, requesterId: actorId },
          tx,
        );
        points = award.events
          .filter((e) => e.userId === report.testerId)
          .reduce((s, e) => s + e.points, 0);
        withheld = award.withheld.map((w) => ({ kind: w.kind, reason: w.reason }));
      }
      const requester = await tx.user.findUnique({
        where: { id: actorId },
        select: { displayName: true },
      });
      await this.notifier.notify(
        [
          {
            userId: report.testerId,
            type: 'bench.reviewed',
            payload: {
              benchId: report.request.id,
              title: report.request.title,
              by: requester?.displayName ?? '',
              decision,
              points,
            },
          },
        ],
        tx,
      );
      return { status, points, withheld };
    });
  }

  private async stats(): Promise<ListBenchResponse['stats']> {
    const [open, reports, confirmed] = await Promise.all([
      this.prisma.benchRequest.count({ where: { ...visible, status: 'open' } }),
      this.prisma.benchReport.count({ where: { status: { not: 'rejected' } } }),
      this.prisma.benchReport.count({ where: { status: 'confirmed' } }),
    ]);
    return { open, reports, confirmed };
  }

  private async items(rows: ItemRow[], viewer: string | null): Promise<BenchItem[]> {
    const ids = rows.map((r) => r.id);
    const [counts, mine] = await Promise.all([
      ids.length
        ? this.prisma.benchReport.groupBy({
            by: ['requestId'],
            where: { requestId: { in: ids }, status: { not: 'rejected' } },
            _count: { _all: true },
          })
        : [],
      viewer && ids.length
        ? this.prisma.benchReport.findMany({
            where: { requestId: { in: ids }, testerId: viewer },
            select: { requestId: true },
          })
        : [],
    ]);
    const testers = new Map(counts.map((c) => [c.requestId, c._count._all]));
    const reported = new Set(mine.map((m) => m.requestId));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      appUrl: r.appUrl,
      repoUrl: r.repoUrl,
      devices: r.devices as BenchDevice[],
      networks: r.networks as BenchNetwork[],
      maxTesters: r.maxTesters,
      testers: testers.get(r.id) ?? 0,
      status: r.status,
      author: r.author,
      mine: viewer === r.authorId,
      reported: reported.has(r.id),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async pointsFor(reportIds: string[]): Promise<Map<string, number>> {
    if (reportIds.length === 0) return new Map();
    const events = await this.prisma.xpEvent.groupBy({
      by: ['sourceId'],
      where: {
        kind: 'field_test_confirmed',
        sourceType: 'bench_report',
        sourceId: { in: reportIds },
        revertedAt: null,
      },
      _sum: { points: true },
    });
    return new Map(events.map((e) => [e.sourceId, e._sum.points ?? 0]));
  }

  private reportView(
    r: Prisma.BenchReportGetPayload<{ include: { tester: typeof author } }>,
    points: number,
  ): BenchReportView {
    return {
      id: r.id,
      tester: r.tester,
      device: r.device as BenchDevice,
      model: r.model,
      os: r.os,
      browser: r.browser,
      network: r.network as BenchNetwork,
      country: r.country,
      verdict: r.verdict,
      findings: (Array.isArray(r.findings) ? r.findings : []) as BenchFinding[],
      notes: r.notes,
      status: r.status,
      points,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
