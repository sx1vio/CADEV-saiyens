import { PAIR_LIMITS, isAllowedVideoLink } from '@devhub/contracts';

// S5 : règles du créneau de pair programming, pures (testées sans base).

export class PairNotFoundError extends Error {}
export class OwnQuestionPairError extends Error {}
export class VideoLinkRejectedError extends Error {}
export class InvalidSlotError extends Error {}
export class PairAlreadyProposedError extends Error {}
export class PairRecentlyDeclinedError extends Error {}
export class PairAlreadyAnsweredError extends Error {}
export class NotPairGuestError extends Error {}

export type PairStatus = 'proposed' | 'accepted' | 'declined' | 'done' | 'cancelled';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Le lien vient d'un service de visio connu ; le créneau est à venir, dans les 30 jours. */
export function assertValidProposal(startsAt: Date, videoLink: string, now: Date): void {
  if (!isAllowedVideoLink(videoLink)) throw new VideoLinkRejectedError();
  const delta = startsAt.getTime() - now.getTime();
  if (
    Number.isNaN(delta) ||
    delta < -PAIR_LIMITS.pastToleranceMinutes * MINUTE_MS ||
    delta > PAIR_LIMITS.maxDaysAhead * DAY_MS
  ) {
    throw new InvalidSlotError();
  }
}

/** Seul l'invité (l'auteur de la question) répond, une seule fois. */
export function assertCanRespond(pair: { guestId: string; status: PairStatus }, actorId: string) {
  if (pair.guestId !== actorId) throw new NotPairGuestError();
  if (pair.status !== 'proposed') throw new PairAlreadyAnsweredError();
}
