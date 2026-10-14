import { describe, expect, it } from 'vitest';
import {
  AlreadyResolvedError,
  AnswerNotFoundError,
  NotQuestionAuthorError,
  OwnAnswerVoteError,
  QuestionClosedError,
  type QuestionState,
  assertCanVote,
  decideAccept,
} from './answer';

const asked = new Date('2026-10-14T10:00:00Z');
const question = (over: Partial<QuestionState> = {}): QuestionState => ({
  id: 'q1',
  title: 'nginx renvoie 502',
  authorId: 'awa',
  status: 'open',
  acceptedAnswerId: null,
  createdAt: asked,
  tagIds: ['docker'],
  ...over,
});
const answer = { id: 'a1', questionId: 'q1', authorId: 'moussa' };
const at = (minutes: number) => new Date(asked.getTime() + minutes * 60_000);

describe('decideAccept (S4)', () => {
  it('l’auteur valide : délai depuis la question, pour le bonus de vitesse', () => {
    expect(decideAccept(question(), answer, 'awa', at(12))).toEqual({
      kind: 'accept',
      minutesToAccept: 12,
    });
  });

  it('seul l’auteur de la question valide', () => {
    expect(() => decideAccept(question(), answer, 'moussa', at(1))).toThrow(NotQuestionAuthorError);
  });

  it('la même réponse déjà validée : rien ne change', () => {
    expect(
      decideAccept(question({ status: 'resolved', acceptedAnswerId: 'a1' }), answer, 'awa', at(1)),
    ).toEqual({ kind: 'already_accepted' });
  });

  it('une autre réponse déjà validée : refus', () => {
    expect(() =>
      decideAccept(question({ status: 'resolved', acceptedAnswerId: 'a2' }), answer, 'awa', at(1)),
    ).toThrow(AlreadyResolvedError);
  });

  it('question fermée, ou réponse d’une autre question : refus', () => {
    expect(() => decideAccept(question({ status: 'closed' }), answer, 'awa', at(1))).toThrow(
      QuestionClosedError,
    );
    expect(() => decideAccept(question(), { ...answer, questionId: 'q2' }, 'awa', at(1))).toThrow(
      AnswerNotFoundError,
    );
  });
});

describe('assertCanVote (X2)', () => {
  it('pas de vote pour sa propre réponse', () => {
    expect(() => assertCanVote(answer, 'moussa')).toThrow(OwnAnswerVoteError);
    expect(() => assertCanVote(answer, 'kwame')).not.toThrow();
  });
});
