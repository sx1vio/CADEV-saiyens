import type { Tx } from '../../../infrastructure/idempotency/idempotency.service';
import type { FeedbackKind, FeedbackState } from '../domain/feedback';
import type { FeedbackRoom, FeedbackWriter } from '../domain/ports';
import type { RoomRole } from '../domain/room';

/** Écritures des demandes de retour et de revue (R6), dans la transaction de la requête. */
export class PrismaFeedbackWriter implements FeedbackWriter {
  constructor(private readonly tx: Tx) {}

  async findRoom(roomId: string): Promise<FeedbackRoom | null> {
    const r = await this.tx.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        stackTagIds: true,
        visibility: true,
        hiddenAt: true,
      },
    });
    return r
      ? {
          id: r.id,
          name: r.name,
          inviteCode: r.inviteCode,
          stackTagIds: r.stackTagIds,
          visibility: r.visibility,
          hidden: r.hiddenAt !== null,
        }
      : null;
  }

  async roleOf(roomId: string, userId: string): Promise<RoomRole | null> {
    const m = await this.tx.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  async memberIds(roomId: string): Promise<string[]> {
    const rows = await this.tx.roomMember.findMany({ where: { roomId }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  async lockRequester(roomId: string, userId: string): Promise<void> {
    await this.tx
      .$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${`rooms.feedback:${roomId}:${userId}`}, 0))) AS l`;
  }

  pendingOf(roomId: string, userId: string, kind: FeedbackKind) {
    return this.tx.feedbackRequest.findFirst({
      where: { roomId, requesterId: userId, kind, status: { in: ['open', 'in_progress'] } },
      select: { id: true },
    });
  }

  create(f: {
    roomId: string;
    requesterId: string;
    kind: FeedbackKind;
    url: string | null;
    note: string | null;
  }) {
    return this.tx.feedbackRequest.create({ data: f, select: { id: true } });
  }

  async lock(id: string): Promise<FeedbackState | null> {
    await this.tx.$queryRaw`SELECT id FROM feedback_requests WHERE id = ${id}::uuid FOR UPDATE`;
    return this.tx.feedbackRequest.findUnique({
      where: { id },
      select: {
        id: true,
        roomId: true,
        requesterId: true,
        reviewerId: true,
        kind: true,
        status: true,
      },
    });
  }

  async take(id: string, reviewerId: string): Promise<void> {
    await this.tx.feedbackRequest.update({
      where: { id },
      data: { reviewerId, status: 'in_progress' },
    });
  }

  async confirm(id: string, at: Date): Promise<void> {
    await this.tx.feedbackRequest.update({
      where: { id },
      data: { status: 'done', confirmedAt: at },
    });
  }

  async cancel(id: string): Promise<void> {
    await this.tx.feedbackRequest.update({ where: { id }, data: { status: 'cancelled' } });
  }

  async displayName(userId: string): Promise<string> {
    const u = await this.tx.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    return u?.displayName ?? '';
  }

  async touch(roomId: string, at: Date): Promise<void> {
    await this.tx.room.update({ where: { id: roomId }, data: { lastActivityAt: at } });
  }
}
