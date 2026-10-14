import {
  AUDIT_ACTION,
  type ModerationAction,
  ReportNotFoundError,
  ReportTargetNotFoundError,
  type ReportTargetType,
  XP_SOURCE,
  decide,
} from '../domain/moderation';
import type { ModerationWriter, ReportState, XpRevertPort } from '../domain/ports';

// M1 : signaler un contenu ; un administrateur le masque, le rétablit ou rejette le signalement.
// Chaque décision est journalisée dans admin_actions (M4).
export class Moderation {
  constructor(
    private readonly xp: XpRevertPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async report(
    writer: ModerationWriter,
    input: { reporterId: string; targetType: ReportTargetType; targetId: string; reason: string },
  ): Promise<{ report: ReportState; created: boolean }> {
    if (!(await writer.findTarget(input.targetType, input.targetId))) {
      throw new ReportTargetNotFoundError();
    }
    return writer.createReport(input);
  }

  async act(
    writer: ModerationWriter,
    tx: unknown,
    input: {
      reportId: string;
      adminId: string;
      action: ModerationAction;
      reason: string;
      revertXp: boolean;
    },
  ): Promise<{ report: ReportState; closedReports: number; revertedXpEvents: number }> {
    const report = await writer.lockReport(input.reportId);
    if (!report) throw new ReportNotFoundError();
    const decision = decide(report.status, input.action, report.targetType);
    const target = await writer.findTarget(report.targetType, report.targetId);
    if (!target) throw new ReportTargetNotFoundError();
    const now = this.now();

    if (decision.hidden !== null) {
      await writer.setHidden(report.targetType, report.targetId, decision.hidden ? now : null);
    }
    // Un masquage ou un rejet clôt aussi les autres signalements ouverts sur le même contenu ;
    // un rétablissement ne touche que ce signalement.
    const closedReports = await writer.closeReports(
      report,
      decision.reportStatus,
      input.adminId,
      now,
      input.action !== 'restore',
    );

    let revertedXpEvents = 0;
    const source = XP_SOURCE[report.targetType];
    if (input.revertXp && source) {
      for (const id of await writer.xpGainsFrom(source, report.targetId)) {
        await this.xp.revert(id, `Modération : ${input.reason}`, tx);
        revertedXpEvents++;
      }
    }

    await writer.audit({
      adminId: input.adminId,
      action: AUDIT_ACTION[input.action],
      targetType: report.targetType,
      targetId: report.targetId,
      reason: input.reason,
    });
    if (decision.hidden && target.topic) {
      await writer.publishHidden(target.topic, report.targetType, report.targetId);
    }
    return {
      report: { ...report, status: decision.reportStatus },
      closedReports,
      revertedXpEvents,
    };
  }
}
