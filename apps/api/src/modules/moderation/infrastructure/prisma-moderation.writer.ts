import type { Tx } from '../../../infrastructure/idempotency/idempotency.service';
import { publishToTopic } from '../../../infrastructure/realtime/realtime.publisher';
import type { ReportStatus, ReportTargetType } from '../domain/moderation';
import type { ModerationWriter, ReportState, TargetState } from '../domain/ports';

const REPORT = {
  id: true,
  targetType: true,
  targetId: true,
  reason: true,
  status: true,
  createdAt: true,
} as const;

/** Écritures de la modération, dans la transaction de l'idempotence. */
export class PrismaModerationWriter implements ModerationWriter {
  constructor(private readonly tx: Tx) {}

  async findTarget(type: ReportTargetType, id: string): Promise<TargetState | null> {
    switch (type) {
      case 'question': {
        const q = await this.tx.question.findUnique({ where: { id }, select: { hiddenAt: true } });
        return q && { topic: `question:${id}`, hidden: q.hiddenAt !== null };
      }
      case 'answer': {
        const a = await this.tx.answer.findUnique({
          where: { id },
          select: { hiddenAt: true, questionId: true },
        });
        return a && { topic: `question:${a.questionId}`, hidden: a.hiddenAt !== null };
      }
      case 'room': {
        const r = await this.tx.room.findUnique({ where: { id }, select: { hiddenAt: true } });
        return r && { topic: `room:${id}`, hidden: r.hiddenAt !== null };
      }
      case 'room_message': {
        const m = await this.tx.roomMessage.findUnique({
          where: { id },
          select: { hiddenAt: true, roomId: true },
        });
        return m && { topic: `room:${m.roomId}`, hidden: m.hiddenAt !== null };
      }
      case 'user': {
        const u = await this.tx.user.findFirst({
          where: { id, deletedAt: null },
          select: { id: true },
        });
        return u && { topic: null, hidden: false };
      }
    }
  }

  async createReport(input: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
  }): Promise<{ report: ReportState; created: boolean }> {
    // ON CONFLICT : une violation d'unicité annulerait toute la transaction de l'idempotence.
    const inserted = await this.tx.$executeRaw`
      INSERT INTO reports (reporter_id, target_type, target_id, reason)
      VALUES (${input.reporterId}::uuid, ${input.targetType}::"ReportTargetType",
              ${input.targetId}::uuid, ${input.reason})
      ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING`;
    const report = await this.tx.report.findUniqueOrThrow({
      where: {
        reporterId_targetType_targetId: {
          reporterId: input.reporterId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      select: REPORT,
    });
    return { report, created: inserted === 1 };
  }

  async lockReport(id: string): Promise<ReportState | null> {
    await this.tx.$executeRaw`SELECT 1 FROM reports WHERE id = ${id}::uuid FOR UPDATE`;
    return this.tx.report.findUnique({ where: { id }, select: REPORT });
  }

  async setHidden(type: ReportTargetType, id: string, hiddenAt: Date | null): Promise<void> {
    const data = { hiddenAt };
    if (type === 'question') await this.tx.question.update({ where: { id }, data });
    else if (type === 'answer') await this.tx.answer.update({ where: { id }, data });
    else if (type === 'room') await this.tx.room.update({ where: { id }, data });
    else if (type === 'room_message') await this.tx.roomMessage.update({ where: { id }, data });
  }

  async closeReports(
    report: ReportState,
    status: Exclude<ReportStatus, 'open'>,
    adminId: string,
    at: Date,
    includeOthersOnTarget: boolean,
  ): Promise<number> {
    const others = includeOthersOnTarget
      ? [{ targetType: report.targetType, targetId: report.targetId, status: 'open' as const }]
      : [];
    const { count } = await this.tx.report.updateMany({
      where: { OR: [{ id: report.id }, ...others] },
      data: { status, handledBy: adminId, handledAt: at },
    });
    return count;
  }

  async audit(entry: {
    adminId: string;
    action: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
  }): Promise<void> {
    await this.tx.adminAction.create({ data: entry });
  }

  async xpGainsFrom(sourceType: string, sourceId: string): Promise<string[]> {
    const events = await this.tx.xpEvent.findMany({
      where: { sourceType, sourceId, revertedAt: null, NOT: { kind: 'revert' } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return events.map((e) => e.id);
  }

  async publishHidden(
    topic: string,
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<void> {
    await publishToTopic(this.tx, topic, 'content.hidden', { targetType, targetId });
  }
}
