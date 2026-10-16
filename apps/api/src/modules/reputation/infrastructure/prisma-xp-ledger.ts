import { Injectable } from '@nestjs/common';
import { type XpKind, isCapped, skillScore } from '@devhub/core';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { PlannedEvent, XpSourceType } from '../domain/award-plan';
import type { LedgerUnitOfWork, StoredXpEvent, XpLedger } from '../domain/ports';

type Tx = Prisma.TransactionClient;
const CAPPED_KINDS = (
  [
    'answer_accepted',
    'answer_fast_bonus',
    'answer_helpful_vote',
    'task_completed',
    'code_review_given',
    'project_demo_shared',
    'question_resolved',
    'deployment_verified',
  ] as XpKind[]
).filter(isCapped);

export class PrismaXpLedger implements XpLedger {
  constructor(private readonly tx: Tx) {}

  async lockUser(userId: string): Promise<void> {
    await this.tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'xp:' + userId}))`;
  }

  async cappedPointsSince(userId: string, since: Date): Promise<number> {
    const sum = await this.tx.xpEvent.aggregate({
      where: { userId, kind: { in: CAPPED_KINDS }, createdAt: { gte: since } },
      _sum: { points: true },
    });
    return sum._sum.points ?? 0;
  }

  async hasGain(
    userId: string,
    kind: XpKind,
    sourceType: XpSourceType,
    sourceId: string,
    counterpartId?: string | null,
  ): Promise<boolean> {
    const count = await this.tx.xpEvent.count({
      where: {
        userId,
        kind,
        sourceType,
        sourceId,
        ...(counterpartId !== undefined ? { counterpartId } : {}),
      },
    });
    return count > 0;
  }

  async countSourcesWithCounterpart(
    userId: string,
    kind: XpKind,
    counterpartId: string,
    since: Date,
  ): Promise<number> {
    const rows = await this.tx.xpEvent.findMany({
      where: { userId, kind, counterpartId, createdAt: { gte: since }, revertedAt: null },
      distinct: ['sourceId'],
      select: { sourceId: true },
    });
    return rows.length;
  }

  async countCounterparts(
    userId: string,
    kind: XpKind,
    sourceType: XpSourceType,
    sourceId: string,
  ): Promise<number> {
    const rows = await this.tx.xpEvent.findMany({
      where: { userId, kind, sourceType, sourceId, revertedAt: null },
      distinct: ['counterpartId'],
      select: { counterpartId: true },
    });
    return rows.length;
  }

  async insert(events: PlannedEvent[], at: Date): Promise<StoredXpEvent[]> {
    const stored: StoredXpEvent[] = [];
    for (const e of events) {
      stored.push(
        (await this.tx.xpEvent.create({
          data: {
            userId: e.userId,
            kind: e.kind,
            points: e.points,
            tagId: e.tagId,
            sourceType: e.sourceType,
            sourceId: e.sourceId,
            counterpartId: e.counterpartId,
            createdAt: at,
          },
        })) as StoredXpEvent,
      );
    }
    return stored;
  }

  async insertRevert(original: StoredXpEvent, reason: string, at: Date): Promise<StoredXpEvent> {
    return (await this.tx.xpEvent.create({
      data: {
        userId: original.userId,
        kind: 'revert',
        points: -original.points,
        tagId: original.tagId,
        sourceType: original.sourceType,
        sourceId: original.sourceId,
        counterpartId: original.counterpartId,
        revertsId: original.id,
        reason,
        createdAt: at,
      },
    })) as StoredXpEvent;
  }

  async find(eventId: string): Promise<StoredXpEvent | null> {
    return (await this.tx.xpEvent.findUnique({ where: { id: eventId } })) as StoredXpEvent | null;
  }

  async markReverted(eventId: string, at: Date): Promise<void> {
    await this.tx.xpEvent.update({ where: { id: eventId }, data: { revertedAt: at } });
  }

  async applyToSkill(userId: string, tagId: string, delta: number): Promise<void> {
    const where = { userId_tagId: { userId, tagId } };
    const row = await this.tx.userSkill.upsert({
      where,
      create: { userId, tagId, xpTag: delta, score: skillScore(0, delta) },
      update: { xpTag: { increment: delta } },
    });
    await this.tx.userSkill.update({
      where,
      data: { score: skillScore(row.githubSignal, row.xpTag) },
    });
  }
}

@Injectable()
export class PrismaLedgerUnitOfWork implements LedgerUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (ledger: XpLedger) => Promise<T>, tx?: unknown): Promise<T> {
    if (tx) return work(new PrismaXpLedger(tx as Tx));
    return this.prisma.$transaction((t) => work(new PrismaXpLedger(t)));
  }
}
