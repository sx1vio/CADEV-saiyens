import type { Tx } from '../../../infrastructure/idempotency/idempotency.service';
import type { JoinRequestState, NewRoom, RoomState, RoomWriter } from '../domain/ports';
import type { RoomRole } from '../domain/room';

/** Écritures des salles, dans la transaction de la requête. */
export class PrismaRoomWriter implements RoomWriter {
  constructor(private readonly tx: Tx) {}

  async tagIdsBySlug(slugs: string[]): Promise<Map<string, string>> {
    const tags = await this.tx.tag.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    return new Map(tags.map((t) => [t.slug, t.id]));
  }

  async inviteCodeTaken(code: string): Promise<boolean> {
    return (await this.tx.room.count({ where: { inviteCode: code } })) > 0;
  }

  createRoom(room: NewRoom): Promise<{ id: string; inviteCode: string }> {
    return this.tx.room.create({
      data: {
        ownerId: room.ownerId,
        name: room.name,
        description: room.description,
        state: room.state,
        visibility: room.visibility,
        repoFullName: room.repo?.fullName ?? null,
        repoVerifiedAt: room.repo ? new Date() : null,
        demoUrl: room.demoUrl,
        stackTagIds: room.stackTagIds,
        inviteCode: room.inviteCode,
      },
      select: { id: true, inviteCode: true },
    });
  }

  async findRoom(roomId: string): Promise<RoomState | null> {
    const r = await this.tx.room.findUnique({
      where: { id: roomId },
      select: { id: true, ownerId: true, name: true, stackTagIds: true, hiddenAt: true },
    });
    return r
      ? {
          id: r.id,
          ownerId: r.ownerId,
          name: r.name,
          stackTagIds: r.stackTagIds,
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

  async lockMembership(roomId: string, userId: string): Promise<void> {
    await this.tx
      .$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${`rooms.join:${roomId}:${userId}`}, 0))) AS l`;
  }

  pendingRequest(roomId: string, userId: string): Promise<JoinRequestState | null> {
    return this.tx.joinRequest.findFirst({
      where: { roomId, userId, status: 'pending' },
      select: { id: true, roomId: true, userId: true, status: true },
    });
  }

  createJoinRequest(
    roomId: string,
    userId: string,
    message: string | null,
  ): Promise<JoinRequestState> {
    return this.tx.joinRequest.create({
      data: { roomId, userId, message },
      select: { id: true, roomId: true, userId: true, status: true },
    });
  }

  async lockJoinRequest(id: string): Promise<JoinRequestState | null> {
    await this.tx.$queryRaw`SELECT id FROM join_requests WHERE id = ${id}::uuid FOR UPDATE`;
    return this.tx.joinRequest.findUnique({
      where: { id },
      select: { id: true, roomId: true, userId: true, status: true },
    });
  }

  async decide(id: string, status: 'accepted' | 'refused', at: Date): Promise<void> {
    await this.tx.joinRequest.update({ where: { id }, data: { status, decidedAt: at } });
  }

  async addMember(roomId: string, userId: string, role: RoomRole): Promise<void> {
    await this.tx.roomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, role },
      update: {},
    });
  }

  async touch(roomId: string, at: Date): Promise<void> {
    await this.tx.room.update({ where: { id: roomId }, data: { lastActivityAt: at } });
  }
}
