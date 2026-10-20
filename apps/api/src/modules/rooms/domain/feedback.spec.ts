import { describe, expect, it } from 'vitest';
import {
  FeedbackAlreadyTakenError,
  FeedbackInvalidStatusError,
  FeedbackNotFoundError,
  FeedbackSelfReviewError,
  type FeedbackState,
  NotFeedbackRequesterError,
  assertCanCancel,
  assertCanConfirm,
  decideTakeFeedback,
  earnsXp,
} from './feedback';

const fr = (over: Partial<FeedbackState> = {}): FeedbackState => ({
  id: 'f1',
  roomId: 'r1',
  requesterId: 'awa',
  reviewerId: null,
  kind: 'code_review',
  status: 'open',
  ...over,
});

describe('demandes de retour et de revue (R6)', () => {
  it('prendre : un autre dev prend une demande ouverte', () => {
    expect(decideTakeFeedback(fr(), 'kwame', true)).toBe('take');
  });

  it('prendre : jamais sa propre demande, ni une salle non visible', () => {
    expect(() => decideTakeFeedback(fr(), 'awa', true)).toThrow(FeedbackSelfReviewError);
    expect(() => decideTakeFeedback(fr(), 'kwame', false)).toThrow(FeedbackNotFoundError);
  });

  it('prendre : la reprendre soi-même ne change rien ; un autre ne peut plus', () => {
    const taken = fr({ status: 'in_progress', reviewerId: 'kwame' });
    expect(decideTakeFeedback(taken, 'kwame', true)).toBe('already_mine');
    expect(() => decideTakeFeedback(taken, 'moussa', true)).toThrow(FeedbackAlreadyTakenError);
    expect(() => decideTakeFeedback(fr({ status: 'done' }), 'kwame', true)).toThrow(
      FeedbackInvalidStatusError,
    );
  });

  it('confirmer : le demandeur, une fois la demande prise', () => {
    const taken = fr({ status: 'in_progress', reviewerId: 'kwame' });
    expect(() => assertCanConfirm(taken, 'awa')).not.toThrow();
    expect(() => assertCanConfirm(taken, 'kwame')).toThrow(NotFeedbackRequesterError);
    expect(() => assertCanConfirm(fr(), 'awa')).toThrow(FeedbackInvalidStatusError);
  });

  it('annuler : le demandeur, tant que la demande est en cours', () => {
    expect(() => assertCanCancel(fr(), 'awa')).not.toThrow();
    expect(() => assertCanCancel(fr(), 'kwame')).toThrow(NotFeedbackRequesterError);
    expect(() => assertCanCancel(fr({ status: 'done' }), 'awa')).toThrow(
      FeedbackInvalidStatusError,
    );
  });

  it('barème : seule une revue de code rapporte des Proof XP', () => {
    expect(earnsXp('code_review')).toBe(true);
    expect(earnsXp('feedback')).toBe(false);
  });
});
