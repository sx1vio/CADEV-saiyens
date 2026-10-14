import type { RoomRole } from './room';

// Ports du module rooms. Les écritures reçoivent la transaction de la requête (idempotence).

export interface VerifiedRepo {
  fullName: string;
  htmlUrl: string;
}

/** Vérification d'un dépôt via l'API GitHub, avec le jeton du créateur (R1). */
export interface RepoVerifier {
  verify(userId: string, fullName: string): Promise<VerifiedRepo>;
}

export interface NewRoom {
  ownerId: string;
  name: string;
  description: string;
  state: 'idea' | 'in_progress' | 'looking_for_help' | 'shipped';
  visibility: 'public' | 'unlisted';
  repo: VerifiedRepo | null;
  demoUrl: string | null;
  stackTagIds: string[];
  inviteCode: string;
}

export interface RoomState {
  id: string;
  ownerId: string;
  name: string;
  stackTagIds: string[];
  hidden: boolean;
}

export interface JoinRequestState {
  id: string;
  roomId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'refused' | 'cancelled';
}

export interface RoomWriter {
  tagIdsBySlug(slugs: string[]): Promise<Map<string, string>>;
  inviteCodeTaken(code: string): Promise<boolean>;
  createRoom(room: NewRoom): Promise<{ id: string; inviteCode: string }>;
  findRoom(roomId: string): Promise<RoomState | null>;
  roleOf(roomId: string, userId: string): Promise<RoomRole | null>;
  /** Sérialise les demandes d'un utilisateur pour une salle (double clic, renvoi hors ligne). */
  lockMembership(roomId: string, userId: string): Promise<void>;
  pendingRequest(roomId: string, userId: string): Promise<JoinRequestState | null>;
  createJoinRequest(
    roomId: string,
    userId: string,
    message: string | null,
  ): Promise<JoinRequestState>;
  lockJoinRequest(id: string): Promise<JoinRequestState | null>;
  decide(id: string, status: 'accepted' | 'refused', at: Date): Promise<void>;
  addMember(roomId: string, userId: string, role: RoomRole): Promise<void>;
  touch(roomId: string, at: Date): Promise<void>;
}

/** Implémenté par AwardXp (module reputation). */
export interface RoomReputationPort {
  projectDemoShared(
    input: { roomId: string; ownerId: string; tagIds: string[] },
    tx?: unknown,
  ): Promise<unknown>;
}

/** Implémenté par Notifier (module notifications). */
export interface RoomNotifier {
  notify(
    notifications: Array<{
      userId: string;
      type: 'join.request' | 'join.decided';
      payload: Record<string, unknown>;
    }>,
    tx?: unknown,
  ): Promise<void>;
}
