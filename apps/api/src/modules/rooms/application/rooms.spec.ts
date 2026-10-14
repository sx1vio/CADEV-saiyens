import { describe, expect, it } from 'vitest';
import type { JoinRequestState, NewRoom, RoomWriter } from '../domain/ports';
import {
  AlreadyMemberError,
  JoinRequestDecidedError,
  NotRoomManagerError,
  type RoomRole,
  UnknownStackError,
  inviteCode,
} from '../domain/room';
import { Rooms } from './rooms';

class MemoryWriter implements RoomWriter {
  rooms: NewRoom[] = [];
  members = new Map<string, RoomRole>();
  requests: Array<JoinRequestState & { message: string | null }> = [];
  takenCodes = new Set<string>();
  locks: string[] = [];
  async tagIdsBySlug(slugs: string[]) {
    return new Map(slugs.filter((s) => s !== 'cobol').map((s) => [s, `t-${s}`]));
  }
  async inviteCodeTaken(code: string) {
    return this.takenCodes.has(code);
  }
  async createRoom(room: NewRoom) {
    this.rooms.push(room);
    return { id: 'r1', inviteCode: room.inviteCode };
  }
  async findRoom(id: string) {
    return id === 'r1'
      ? { id, ownerId: 'awa', name: 'Paylink', stackTagIds: [], hidden: false }
      : null;
  }
  async roleOf(roomId: string, userId: string) {
    return this.members.get(`${roomId}:${userId}`) ?? null;
  }
  async lockMembership(roomId: string, userId: string) {
    this.locks.push(`${roomId}:${userId}`);
  }
  async pendingRequest(roomId: string, userId: string) {
    return (
      this.requests.find(
        (r) => r.roomId === roomId && r.userId === userId && r.status === 'pending',
      ) ?? null
    );
  }
  async createJoinRequest(roomId: string, userId: string, message: string | null) {
    const r = {
      id: `j${this.requests.length + 1}`,
      roomId,
      userId,
      status: 'pending' as const,
      message,
    };
    this.requests.push(r);
    return r;
  }
  async lockJoinRequest(id: string) {
    return this.requests.find((r) => r.id === id) ?? null;
  }
  async decide(id: string, status: 'accepted' | 'refused') {
    this.requests.find((r) => r.id === id)!.status = status;
  }
  async addMember(roomId: string, userId: string, role: RoomRole) {
    this.members.set(`${roomId}:${userId}`, role);
  }
  async touch() {}
}

const deps = () => {
  const xp: string[] = [];
  const sent: Array<{ userId: string; type: string }> = [];
  let n = 0;
  const rooms = new Rooms(
    { projectDemoShared: async (i) => void xp.push(`demo:${i.ownerId}`) },
    { notify: async (list) => void sent.push(...list) },
    (size) => new Uint8Array(size).fill(n++),
  );
  return { rooms, xp, sent };
};

const input = {
  ownerId: 'awa',
  name: 'Paylink',
  description: 'Paiements mobile money pour les petits commerces.',
  state: 'looking_for_help' as const,
  visibility: 'public' as const,
  repo: { fullName: 'awa/paylink', htmlUrl: 'https://github.com/awa/paylink' },
  demoUrl: 'https://paylink.example',
  stackTagSlugs: ['nodejs', 'docker', 'nodejs'],
};

describe('inviteCode (R7)', () => {
  it('8 caractères sans ambiguïté', () => {
    const code = inviteCode((n) => new Uint8Array(n).map((_, i) => i * 37));
    expect(code).toMatch(/^[a-hj-km-np-z2-9]{8}$/);
  });
});

describe('Rooms (R1, R3)', () => {
  it('crée la salle, le créateur devient « owner », +5 XP pour la démo', async () => {
    const writer = new MemoryWriter();
    const { rooms, xp } = deps();
    const room = await rooms.create(writer, 'tx', input);
    expect(writer.rooms[0]).toMatchObject({
      stackTagIds: ['t-nodejs', 't-docker'],
      repo: input.repo,
    });
    expect(writer.members.get('r1:awa')).toBe('owner');
    expect(room.inviteCode).toHaveLength(8);
    expect(xp).toEqual(['demo:awa']);
  });

  it('code déjà pris : un autre est tiré ; sans démo, pas d’XP', async () => {
    const writer = new MemoryWriter();
    const { rooms, xp } = deps();
    writer.takenCodes.add(inviteCode((n) => new Uint8Array(n).fill(0)));
    const room = await rooms.create(writer, 'tx', { ...input, demoUrl: null });
    expect(writer.takenCodes.has(room.inviteCode)).toBe(false);
    expect(xp).toEqual([]);
  });

  it('étiquette inconnue : refus', async () => {
    await expect(
      deps().rooms.create(new MemoryWriter(), 'tx', { ...input, stackTagSlugs: ['cobol'] }),
    ).rejects.toEqual(new UnknownStackError(['cobol']));
  });

  it('demander à rejoindre : le créateur est notifié ; une seconde demande renvoie la première', async () => {
    const writer = new MemoryWriter();
    const { rooms, sent } = deps();
    const first = await rooms.requestJoin(writer, 'tx', {
      roomId: 'r1',
      userId: 'moussa',
      message: 'Je connais Docker',
    });
    const again = await rooms.requestJoin(writer, 'tx', {
      roomId: 'r1',
      userId: 'moussa',
      message: null,
    });
    expect(first.created).toBe(true);
    expect(again).toEqual({ request: first.request, created: false });
    expect(sent).toEqual([expect.objectContaining({ userId: 'awa', type: 'join.request' })]);
    expect(writer.locks).toEqual(['r1:moussa', 'r1:moussa']);
  });

  it('un membre ne redemande pas', async () => {
    const writer = new MemoryWriter();
    writer.members.set('r1:moussa', 'member');
    await expect(
      deps().rooms.requestJoin(writer, 'tx', { roomId: 'r1', userId: 'moussa', message: null }),
    ).rejects.toBeInstanceOf(AlreadyMemberError);
  });

  it('décider : réservé au créateur ; accepter ajoute le membre ; la décision contraire est refusée', async () => {
    const writer = new MemoryWriter();
    writer.members.set('r1:awa', 'owner');
    const { rooms, sent } = deps();
    const { request } = await rooms.requestJoin(writer, 'tx', {
      roomId: 'r1',
      userId: 'moussa',
      message: null,
    });

    await expect(
      rooms.decide(writer, 'tx', { requestId: request.id, actorId: 'moussa', decision: 'accept' }),
    ).rejects.toBeInstanceOf(NotRoomManagerError);
    const out = await rooms.decide(writer, 'tx', {
      requestId: request.id,
      actorId: 'awa',
      decision: 'accept',
    });
    expect(out.request.status).toBe('accepted');
    expect(writer.members.get('r1:moussa')).toBe('member');
    expect(sent.at(-1)).toMatchObject({ userId: 'moussa', type: 'join.decided' });

    // Même décision : sans effet ; décision contraire : refus.
    await rooms.decide(writer, 'tx', { requestId: request.id, actorId: 'awa', decision: 'accept' });
    await expect(
      rooms.decide(writer, 'tx', { requestId: request.id, actorId: 'awa', decision: 'refuse' }),
    ).rejects.toBeInstanceOf(JoinRequestDecidedError);
  });
});
