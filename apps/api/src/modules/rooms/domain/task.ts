import { NotRoomManagerError, type RoomRole, canManage } from './room';

// Règles pures des tâches (R2, R8, R9). Aucune dépendance à Nest ni à Prisma.

export class TaskNotFoundError extends Error {}
export class NotRoomMemberError extends Error {}
export class TaskAlreadyTakenError extends Error {}
/** Action impossible dans l'état actuel de la tâche (ex. soumettre une tâche ouverte). */
export class TaskInvalidStatusError extends Error {}
/** La PR n'appartient pas au dépôt de la salle, ou la salle n'a pas de dépôt. */
export class TaskPrInvalidError extends Error {}
export class NotTaskAssigneeError extends Error {}

export type TaskStatus = 'open' | 'taken' | 'in_review' | 'done';
export type Verification = 'github_verified' | 'declared';

export interface TaskState {
  id: string;
  roomId: string;
  status: TaskStatus;
  assigneeId: string | null;
  prUrl: string | null;
}

export interface PullRef {
  fullName: string;
  number: number;
}

/** R2 : un membre prend une tâche ouverte ; la reprendre soi-même ne change rien. */
export function decideTake(
  task: TaskState,
  actorId: string,
  role: RoomRole | null,
): 'take' | 'already_mine' {
  if (!role) throw new NotRoomMemberError();
  if (task.status === 'open') return 'take';
  if (task.assigneeId === actorId && task.status === 'taken') return 'already_mine';
  throw new TaskAlreadyTakenError();
}

/** Une PR doit appartenir au dépôt lié à la salle (casse ignorée, comme sur GitHub). */
export function assertPrInRepo(
  pull: PullRef | null,
  roomRepo: string | null,
): asserts pull is PullRef {
  if (!pull || !roomRepo || pull.fullName.toLowerCase() !== roomRepo.toLowerCase()) {
    throw new TaskPrInvalidError();
  }
}

/** R2 : l'assigné passe sa tâche en revue avec le lien de sa PR. */
export function assertCanSubmit(task: TaskState, actorId: string): void {
  if (task.assigneeId !== actorId) throw new NotTaskAssigneeError();
  if (task.status !== 'taken' && task.status !== 'in_review') throw new TaskInvalidStatusError();
}

/** R8 : le créateur (ou un mainteneur) clôt une tâche prise ou en revue. */
export function assertCanComplete(task: TaskState, role: RoomRole | null): void {
  if (!role) throw new NotRoomMemberError();
  if (!canManage(role)) throw new NotRoomManagerError();
  if (!task.assigneeId || (task.status !== 'taken' && task.status !== 'in_review')) {
    throw new TaskInvalidStatusError();
  }
}

/** R9 : « Vérifié par GitHub » seulement si la PR est fusionnée et que son auteur est l'assigné. */
export function verificationOf(
  pull: { merged: boolean; authorId: bigint | null } | null,
  assigneeGithubId: bigint | null,
): Verification {
  return pull?.merged &&
    pull.authorId !== null &&
    assigneeGithubId !== null &&
    pull.authorId === assigneeGithubId
    ? 'github_verified'
    : 'declared';
}
