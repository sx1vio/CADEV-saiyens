import {
  AlreadyMemberError,
  JoinRequestDecidedError,
  JoinRequestNotFoundError,
  NotRoomManagerError,
  RoomNotFoundError,
  UnknownStackError,
  canManage,
  inviteCode,
} from '../domain/room';
import type {
  JoinRequestState,
  RoomNotifier,
  RoomReputationPort,
  RoomWriter,
  VerifiedRepo,
} from '../domain/ports';

export interface CreateRoomInput {
  ownerId: string;
  name: string;
  description: string;
  state: 'idea' | 'in_progress' | 'looking_for_help' | 'shipped';
  visibility: 'public' | 'unlisted';
  /** Dépôt déjà vérifié via GitHub, hors transaction (l'appel peut durer 10 s). */
  repo: VerifiedRepo | null;
  demoUrl: string | null;
  stackTagSlugs: string[];
}

/**
 * R1, R3, R7 : créer une salle, demander à la rejoindre, décider. Le créateur devient membre
 * « owner » ; une démo en ligne rapporte +5 Proof XP, une seule fois (§6.3).
 */
export class Rooms {
  constructor(
    private readonly reputation: RoomReputationPort,
    private readonly notifier: RoomNotifier,
    private readonly randomBytes: (n: number) => Uint8Array,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(
    writer: RoomWriter,
    tx: unknown,
    input: CreateRoomInput,
  ): Promise<{ id: string; inviteCode: string }> {
    const slugs = [...new Set(input.stackTagSlugs)];
    const tags = await writer.tagIdsBySlug(slugs);
    const unknown = slugs.filter((s) => !tags.has(s));
    if (unknown.length > 0) throw new UnknownStackError(unknown);

    let code = inviteCode(this.randomBytes);
    for (let attempt = 0; (await writer.inviteCodeTaken(code)) && attempt < 5; attempt++) {
      code = inviteCode(this.randomBytes);
    }
    const stackTagIds = slugs.map((s) => tags.get(s)!);
    const room = await writer.createRoom({
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      state: input.state,
      visibility: input.visibility,
      repo: input.repo,
      demoUrl: input.demoUrl,
      stackTagIds,
      inviteCode: code,
    });
    await writer.addMember(room.id, input.ownerId, 'owner');
    if (input.demoUrl) {
      await this.reputation.projectDemoShared(
        { roomId: room.id, ownerId: input.ownerId, tagIds: stackTagIds },
        tx,
      );
    }
    return room;
  }

  /** R3 : demander à rejoindre. Une demande en attente existante est renvoyée telle quelle. */
  async requestJoin(
    writer: RoomWriter,
    tx: unknown,
    input: { roomId: string; userId: string; message: string | null },
  ): Promise<{ request: JoinRequestState; created: boolean }> {
    const room = await writer.findRoom(input.roomId);
    if (!room || room.hidden) throw new RoomNotFoundError();
    await writer.lockMembership(room.id, input.userId);
    if (await writer.roleOf(room.id, input.userId)) throw new AlreadyMemberError();
    const pending = await writer.pendingRequest(room.id, input.userId);
    if (pending) return { request: pending, created: false };

    const request = await writer.createJoinRequest(room.id, input.userId, input.message);
    await this.notifier.notify(
      [
        {
          userId: room.ownerId,
          type: 'join.request',
          payload: { roomId: room.id, requestId: request.id, roomName: room.name },
        },
      ],
      tx,
    );
    return { request, created: true };
  }

  /** R3 : le créateur (ou un mainteneur) accepte ou refuse ; le demandeur est notifié. */
  async decide(
    writer: RoomWriter,
    tx: unknown,
    input: { requestId: string; actorId: string; decision: 'accept' | 'refuse' },
  ): Promise<{ request: JoinRequestState; decidedAt: Date }> {
    const request = await writer.lockJoinRequest(input.requestId);
    if (!request) throw new JoinRequestNotFoundError();
    if (!canManage(await writer.roleOf(request.roomId, input.actorId)))
      throw new NotRoomManagerError();
    const status = input.decision === 'accept' ? 'accepted' : 'refused';
    const now = this.now();
    if (request.status !== 'pending') {
      // Même décision renvoyée : rien ne change ; décision contraire : refus explicite.
      if (request.status === status) return { request, decidedAt: now };
      throw new JoinRequestDecidedError();
    }
    await writer.decide(request.id, status, now);
    if (status === 'accepted') await writer.addMember(request.roomId, request.userId, 'member');
    await writer.touch(request.roomId, now);
    const room = await writer.findRoom(request.roomId);
    await this.notifier.notify(
      [
        {
          userId: request.userId,
          type: 'join.decided',
          payload: { roomId: request.roomId, roomName: room?.name ?? '', decision: status },
        },
      ],
      tx,
    );
    return { request: { ...request, status }, decidedAt: now };
  }
}
