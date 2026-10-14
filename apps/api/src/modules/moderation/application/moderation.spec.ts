import { describe, expect, it } from 'vitest';
import {
  ReportNotFoundError,
  ReportTargetNotFoundError,
  type ReportTargetType,
} from '../domain/moderation';
import type { ModerationWriter, ReportState, TargetState } from '../domain/ports';
import { Moderation } from './moderation';

class MemoryWriter implements ModerationWriter {
  reports: ReportState[] = [];
  targets = new Map<string, TargetState>([['a1', { topic: 'question:q1', hidden: false }]]);
  hidden = new Map<string, Date | null>();
  audits: string[] = [];
  published: string[] = [];
  closed: Array<[string, string, boolean]> = [];
  async findTarget(_type: string, id: string) {
    return this.targets.get(id) ?? null;
  }
  async createReport(input: { targetType: ReportTargetType; targetId: string; reason: string }) {
    const report: ReportState = {
      id: `r${this.reports.length + 1}`,
      status: 'open',
      createdAt: new Date(0),
      ...input,
    };
    this.reports.push(report);
    return { report, created: true };
  }
  async lockReport(id: string) {
    return this.reports.find((r) => r.id === id) ?? null;
  }
  async setHidden(_type: string, id: string, at: Date | null) {
    this.hidden.set(id, at);
  }
  async closeReports(
    r: ReportState,
    status: ReportState['status'],
    _a: string,
    _at: Date,
    all: boolean,
  ) {
    this.closed.push([r.id, status, all]);
    r.status = status;
    return all ? 2 : 1;
  }
  async audit(e: { action: string }) {
    this.audits.push(e.action);
  }
  async xpGainsFrom(sourceType: string, sourceId: string) {
    return sourceType === 'answer' && sourceId === 'a1' ? ['x1', 'x2'] : [];
  }
  async publishHidden(topic: string) {
    this.published.push(topic);
  }
}

const now = new Date('2026-10-16T10:00:00Z');
const setup = () => {
  const reverted: string[] = [];
  const moderation = new Moderation(
    { revert: async (id, reason) => void reverted.push(`${id}:${reason}`) },
    () => now,
  );
  return { moderation, reverted, writer: new MemoryWriter() };
};

describe('Moderation (M1, M4)', () => {
  it('signaler un contenu inexistant : refus', async () => {
    const { moderation, writer } = setup();
    await expect(
      moderation.report(writer, {
        reporterId: 'u',
        targetType: 'answer',
        targetId: 'nope',
        reason: 'spam',
      }),
    ).rejects.toBeInstanceOf(ReportTargetNotFoundError);
  });

  it('masquer : contenu caché, signalements clos, XP annulés, audit, événement temps réel', async () => {
    const { moderation, writer, reverted } = setup();
    const { report } = await moderation.report(writer, {
      reporterId: 'u',
      targetType: 'answer',
      targetId: 'a1',
      reason: 'spam',
    });
    const out = await moderation.act(writer, 'tx', {
      reportId: report.id,
      adminId: 'admin',
      action: 'hide',
      reason: 'Publicité',
      revertXp: true,
    });
    expect(out).toMatchObject({
      closedReports: 2,
      revertedXpEvents: 2,
      report: { status: 'actioned' },
    });
    expect(writer.hidden.get('a1')).toEqual(now);
    expect(reverted).toEqual(['x1:Modération : Publicité', 'x2:Modération : Publicité']);
    expect(writer.audits).toEqual(['hide_content']);
    expect(writer.published).toEqual(['question:q1']);

    const back = await moderation.act(writer, 'tx', {
      reportId: report.id,
      adminId: 'admin',
      action: 'restore',
      reason: 'Erreur',
      revertXp: false,
    });
    expect(back.report.status).toBe('dismissed');
    expect(writer.hidden.get('a1')).toBeNull();
    expect(writer.closed.at(-1)).toEqual([report.id, 'dismissed', false]);
    expect(writer.audits).toEqual(['hide_content', 'restore_content']);
    expect(writer.published).toHaveLength(1);
  });

  it('signalement inconnu : refus', async () => {
    const { moderation, writer } = setup();
    await expect(
      moderation.act(writer, 'tx', {
        reportId: 'r9',
        adminId: 'admin',
        action: 'dismiss',
        reason: 'ras',
        revertXp: false,
      }),
    ).rejects.toBeInstanceOf(ReportNotFoundError);
  });
});
