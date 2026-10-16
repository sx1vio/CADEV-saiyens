import { describe, expect, it } from 'vitest';
import { XP_LIMITS, XP_POINTS, applyDailyCap, isCapped, splitPoints, startOfUtcDay } from './rules';

describe('barème (§6.3)', () => {
  it('reprend les points du cahier des charges', () => {
    expect(XP_POINTS).toEqual({
      answer_accepted: 10,
      answer_fast_bonus: 3,
      answer_helpful_vote: 2,
      task_completed: 15,
      code_review_given: 8,
      project_demo_shared: 5,
      question_resolved: 1,
      deployment_verified: 10,
    });
  });

  it('exclut seulement le bonus de vitesse du plafond', () => {
    expect(isCapped('answer_fast_bonus')).toBe(false);
    expect(isCapped('answer_accepted')).toBe(true);
  });
});

describe('applyDailyCap', () => {
  it('attribue tout sous le plafond', () => {
    expect(applyDailyCap(10, 0)).toBe(10);
  });

  it('attribue seulement ce qui reste', () => {
    expect(applyDailyCap(10, 55)).toBe(5);
    expect(applyDailyCap(10, 50)).toBe(10);
  });

  it('n’attribue rien au-delà, et jamais en négatif', () => {
    expect(applyDailyCap(10, 60)).toBe(0);
    expect(applyDailyCap(10, 75)).toBe(0);
  });

  it('ignore un total du jour négatif (annulations)', () => {
    expect(applyDailyCap(10, -20)).toBe(10);
  });

  it('accepte un plafond explicite', () => {
    expect(applyDailyCap(10, 3, 5)).toBe(2);
    expect(XP_LIMITS.dailyCap).toBe(60);
  });
});

describe('splitPoints', () => {
  it.each([
    [10, 1, [10]],
    [10, 2, [5, 5]],
    [10, 3, [4, 3, 3]],
    [10, 4, [3, 3, 2, 2]],
    [2, 3, [1, 1, 0]],
  ])('%i points sur %i étiquettes → %j', (points, parts, expected) => {
    expect(splitPoints(points, parts)).toEqual(expected);
    expect(splitPoints(points, parts).reduce((a, b) => a + b, 0)).toBe(points);
  });

  it('met tout dans une part sans étiquette', () => {
    expect(splitPoints(1, 0)).toEqual([1]);
  });
});

describe('startOfUtcDay', () => {
  it('renvoie minuit UTC', () => {
    expect(startOfUtcDay(new Date('2026-10-08T23:59:59Z')).toISOString()).toBe(
      '2026-10-08T00:00:00.000Z',
    );
  });
});
