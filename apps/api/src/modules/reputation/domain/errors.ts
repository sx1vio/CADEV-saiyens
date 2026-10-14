/** X2 : voter pour sa propre réponse est interdit (403 xp.self_vote). */
export class SelfVoteError extends Error {
  readonly code = 'xp.self_vote';
}

export class XpEventNotRevertableError extends Error {
  readonly code = 'xp.not_revertable';
}

/** Raisons pour lesquelles une action légitime ne rapporte pas (ou pas tout) d'XP. Affichées par le front. */
export type WithheldReason =
  'self' | 'already_awarded' | 'daily_cap' | 'pair_weekly_limit' | 'voter_too_new' | 'vote_cap';
