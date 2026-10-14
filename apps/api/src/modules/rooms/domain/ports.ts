import type { TaskState } from './task';
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

// ─────────────── Tâches (R2, R8, R9) et discussion (R4) ───────────────

export interface TaskRoom {
  id: string;
  ownerId: string;
  name: string;
  repoFullName: string | null;
  stackTagIds: string[];
  hidden: boolean;
}

export interface TaskWriter {
  findRoom(roomId: string): Promise<TaskRoom | null>;
  roleOf(roomId: string, userId: string): Promise<RoomRole | null>;
  /** Verrouille la tâche (SELECT … FOR UPDATE) : une seule prise à la fois. */
  lockTask(taskId: string): Promise<TaskState | null>;
  createTask(t: {
    roomId: string;
    title: string;
    description: string | null;
    level: 'first_step' | 'easy' | 'medium' | 'hard';
    githubIssueId?: bigint;
  }): Promise<{ id: string }>;
  /** Identifiants d'issues déjà importées dans la salle. */
  importedIssueIds(roomId: string): Promise<Set<bigint>>;
  take(taskId: string, userId: string, at: Date): Promise<void>;
  submit(taskId: string, prUrl: string): Promise<void>;
  complete(
    taskId: string,
    prUrl: string | null,
    verification: 'github_verified' | 'declared',
    at: Date,
  ): Promise<void>;
  touch(roomId: string, at: Date): Promise<void>;
}

/** Implémenté par AwardXp (module reputation) : +15 XP au contributeur (R8). */
export interface TaskReputationPort {
  taskCompleted(
    input: { taskId: string; contributorId: string; ownerId: string; tagIds: string[] },
    tx?: unknown,
  ): Promise<{
    events: Array<{ userId: string; points: number }>;
    withheld: Array<{ userId: string; kind: string; reason: string }>;
  }>;
}

export interface TaskNotifier {
  notify(
    notifications: Array<{
      userId: string;
      type: 'task.completed';
      payload: Record<string, unknown>;
    }>,
    tx?: unknown,
  ): Promise<void>;
}

export interface MessageWriter {
  findRoom(roomId: string): Promise<TaskRoom | null>;
  roleOf(roomId: string, userId: string): Promise<RoomRole | null>;
  lockAuthor(authorId: string): Promise<void>;
  findByClientId(authorId: string, clientId: string): Promise<{ id: string } | null>;
  create(m: {
    roomId: string;
    authorId: string;
    clientId: string;
    kind: 'text' | 'standup';
    body: string;
  }): Promise<{ id: string }>;
  touch(roomId: string, at: Date): Promise<void>;
}
