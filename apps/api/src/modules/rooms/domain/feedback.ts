import { NotRoomMemberError } from './task';
import type { RoomRole } from './room';

// Règles pures des demandes de retour et de revue de code (R6). Aucune dépendance à Nest ni à Prisma.

export class FeedbackNotFoundError extends Error {}
/** Le demandeur a déjà une demande du même type en cours dans cette salle. */
export class FeedbackAlreadyOpenError extends Error {}
/** Un autre dev relit déjà ce projet. */
export class FeedbackAlreadyTakenError extends Error {}
/** On ne relit pas sa propre demande. */
export class FeedbackSelfReviewError extends Error {}
/** Seul le demandeur confirme ou annule. */
export class NotFeedbackRequesterError extends Error {}
/** Action impossible dans l'état actuel de la demande. */
export class FeedbackInvalidStatusError extends Error {}

export type FeedbackKind = 'feedback' | 'code_review';
export type FeedbackStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

export interface FeedbackState {
  id: string;
  roomId: string;
  requesterId: string;
  reviewerId: string | null;
  kind: FeedbackKind;
  status: FeedbackStatus;
}

export const isPending = (s: FeedbackStatus): boolean => s === 'open' || s === 'in_progress';

/** Tout membre de la salle peut demander un retour sur le projet. */
export function assertCanRequest(role: RoomRole | null): void {
  if (!role) throw new NotRoomMemberError();
}

/**
 * Un autre dev prend la demande : n'importe quel compte pour une salle publique (flux de la
 * stack), les membres seulement pour une salle non listée. La reprendre soi-même ne change rien.
 */
export function decideTakeFeedback(
  fr: FeedbackState,
  actorId: string,
  canSee: boolean,
): 'take' | 'already_mine' {
  if (!canSee) throw new FeedbackNotFoundError();
  if (fr.requesterId === actorId) throw new FeedbackSelfReviewError();
  if (fr.status === 'open') return 'take';
  if (fr.status === 'in_progress' && fr.reviewerId === actorId) return 'already_mine';
  if (fr.status === 'in_progress') throw new FeedbackAlreadyTakenError();
  throw new FeedbackInvalidStatusError();
}

/** Le demandeur confirme la revue d'un relecteur (déclenche les +8 XP d'une revue de code). */
export function assertCanConfirm(
  fr: FeedbackState,
  actorId: string,
): asserts fr is FeedbackState & { reviewerId: string } {
  if (fr.requesterId !== actorId) throw new NotFeedbackRequesterError();
  if (fr.status !== 'in_progress' || !fr.reviewerId) throw new FeedbackInvalidStatusError();
}

export function assertCanCancel(fr: FeedbackState, actorId: string): void {
  if (fr.requesterId !== actorId) throw new NotFeedbackRequesterError();
  if (!isPending(fr.status)) throw new FeedbackInvalidStatusError();
}

/** Barème §6.3 : seule une revue de code donne des Proof XP (« Revue de code donnée », +8). */
export const earnsXp = (kind: FeedbackKind): boolean => kind === 'code_review';
