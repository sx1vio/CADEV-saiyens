// Règles pures des réponses (S4). Aucune dépendance à Nest ni à Prisma.

export class QuestionNotFoundError extends Error {}
export class AnswerNotFoundError extends Error {}
export class QuestionClosedError extends Error {}
/** Seul l'auteur de la question valide une réponse. */
export class NotQuestionAuthorError extends Error {}
/** La question a déjà été résolue par une autre réponse. */
export class AlreadyResolvedError extends Error {}
/** Voter pour sa propre réponse (X2). */
export class OwnAnswerVoteError extends Error {}

export interface QuestionState {
  id: string;
  title: string;
  authorId: string;
  status: 'open' | 'resolved' | 'closed';
  acceptedAnswerId: string | null;
  createdAt: Date;
  tagIds: string[];
}

export interface AnswerState {
  id: string;
  questionId: string;
  authorId: string;
}

export type AcceptDecision =
  | { kind: 'accept'; minutesToAccept: number }
  /** Cette réponse est déjà la réponse validée : rien ne change (rejeu, double clic). */
  | { kind: 'already_accepted' };

/** S4 : l'auteur valide la réponse qui l'a débloqué. Une seule réponse validée par question. */
export function decideAccept(
  question: QuestionState,
  answer: AnswerState,
  actorId: string,
  now: Date,
): AcceptDecision {
  if (answer.questionId !== question.id) throw new AnswerNotFoundError();
  if (actorId !== question.authorId) throw new NotQuestionAuthorError();
  if (question.acceptedAnswerId === answer.id) return { kind: 'already_accepted' };
  if (question.status === 'resolved') throw new AlreadyResolvedError();
  if (question.status === 'closed') throw new QuestionClosedError();
  const minutesToAccept = Math.max(0, (now.getTime() - question.createdAt.getTime()) / 60_000);
  return { kind: 'accept', minutesToAccept };
}

/** X2 : pas de vote pour sa propre réponse. */
export function assertCanVote(answer: AnswerState, voterId: string): void {
  if (answer.authorId === voterId) throw new OwnAnswerVoteError();
}
