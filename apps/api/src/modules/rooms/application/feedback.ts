import { maskSecrets } from '@devhub/core';
import {
  FeedbackAlreadyOpenError,
  FeedbackNotFoundError,
  type FeedbackKind,
  assertCanCancel,
  assertCanConfirm,
  assertCanRequest,
  decideTakeFeedback,
  earnsXp,
} from '../domain/feedback';
import type { FeedbackNotifier, FeedbackReputationPort, FeedbackWriter } from '../domain/ports';
import { RoomNotFoundError } from '../domain/room';

/**
 * R6 : un membre demande un retour ou une revue de code sur le projet de sa salle. La demande
 * part dans le flux de la stack et chez les autres membres ; un dev la prend, fait sa revue (sur
 * GitHub ou ailleurs), puis le demandeur confirme. Les XP et les notifications suivent dans la
 * même transaction.
 */
export class FeedbackRequests {
  constructor(
    private readonly reputation: FeedbackReputationPort,
    private readonly notifier: FeedbackNotifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async visibleRoom(writer: FeedbackWriter, roomId: string) {
    const room = await writer.findRoom(roomId);
    if (!room || room.hidden) throw new RoomNotFoundError();
    return room;
  }

  async create(
    writer: FeedbackWriter,
    tx: unknown,
    input: {
      roomId: string;
      actorId: string;
      kind: FeedbackKind;
      url: string | null;
      note: string | null;
    },
  ): Promise<{ id: string }> {
    const room = await this.visibleRoom(writer, input.roomId);
    assertCanRequest(await writer.roleOf(room.id, input.actorId));
    await writer.lockRequester(room.id, input.actorId);
    if (await writer.pendingOf(room.id, input.actorId, input.kind)) {
      throw new FeedbackAlreadyOpenError();
    }
    const note = input.note ? maskSecrets(input.note).text : null;
    const created = await writer.create({
      roomId: room.id,
      requesterId: input.actorId,
      kind: input.kind,
      url: input.url,
      note,
    });
    await writer.touch(room.id, this.now());

    const others = (await writer.memberIds(room.id)).filter((id) => id !== input.actorId);
    if (others.length > 0) {
      const by = await writer.displayName(input.actorId);
      await this.notifier.notify(
        others.map((userId) => ({
          userId,
          type: 'feedback.requested' as const,
          payload: {
            feedbackRequestId: created.id,
            roomId: room.id,
            roomName: room.name,
            code: room.inviteCode,
            kind: input.kind,
            by,
          },
        })),
        tx,
      );
    }
    return created;
  }

  async take(
    writer: FeedbackWriter,
    tx: unknown,
    input: { id: string; actorId: string },
  ): Promise<{ roomId: string }> {
    const fr = await writer.lock(input.id);
    if (!fr) throw new FeedbackNotFoundError();
    const room = await writer.findRoom(fr.roomId);
    if (!room || room.hidden) throw new FeedbackNotFoundError();
    const canSee =
      room.visibility === 'public' || (await writer.roleOf(room.id, input.actorId)) !== null;
    if (decideTakeFeedback(fr, input.actorId, canSee) === 'take') {
      await writer.take(fr.id, input.actorId);
      await writer.touch(room.id, this.now());
      await this.notifier.notify(
        [
          {
            userId: fr.requesterId,
            type: 'feedback.taken',
            payload: {
              feedbackRequestId: fr.id,
              roomId: room.id,
              roomName: room.name,
              code: room.inviteCode,
              kind: fr.kind,
              by: await writer.displayName(input.actorId),
            },
          },
        ],
        tx,
      );
    }
    return { roomId: room.id };
  }

  /** +8 XP au relecteur pour une revue de code (retenus selon les garde-fous du barème). */
  async confirm(
    writer: FeedbackWriter,
    tx: unknown,
    input: { id: string; actorId: string },
  ): Promise<{
    roomId: string;
    points: number;
    withheld: Array<{ kind: string; reason: string }>;
  }> {
    const fr = await writer.lock(input.id);
    if (!fr) throw new FeedbackNotFoundError();
    const room = await writer.findRoom(fr.roomId);
    if (!room || room.hidden) throw new FeedbackNotFoundError();
    assertCanConfirm(fr, input.actorId);
    const now = this.now();
    await writer.confirm(fr.id, now);
    await writer.touch(room.id, now);

    let points = 0;
    let withheld: Array<{ kind: string; reason: string }> = [];
    if (earnsXp(fr.kind)) {
      const xp = await this.reputation.codeReviewGiven(
        {
          feedbackRequestId: fr.id,
          reviewerId: fr.reviewerId,
          requesterId: fr.requesterId,
          tagIds: room.stackTagIds,
        },
        tx,
      );
      points = xp.events
        .filter((e) => e.userId === fr.reviewerId)
        .reduce((s, e) => s + e.points, 0);
      withheld = xp.withheld.map((w) => ({ kind: w.kind, reason: w.reason }));
    }
    await this.notifier.notify(
      [
        {
          userId: fr.reviewerId,
          type: 'feedback.confirmed',
          payload: {
            feedbackRequestId: fr.id,
            roomId: room.id,
            roomName: room.name,
            code: room.inviteCode,
            kind: fr.kind,
            by: await writer.displayName(input.actorId),
            points,
          },
        },
      ],
      tx,
    );
    return { roomId: room.id, points, withheld };
  }

  async cancel(writer: FeedbackWriter, input: { id: string; actorId: string }) {
    const fr = await writer.lock(input.id);
    if (!fr) throw new FeedbackNotFoundError();
    assertCanCancel(fr, input.actorId);
    await writer.cancel(fr.id);
    return { roomId: fr.roomId };
  }
}
