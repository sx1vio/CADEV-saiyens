import { describe, expect, it } from 'vitest';
import { type GainRequest, planGain } from './award-plan';

const accepted: GainRequest = {
  userId: 'helper',
  kind: 'answer_accepted',
  sourceType: 'answer',
  sourceId: 'a1',
  tagIds: ['docker', 'nginx', 'node'],
  counterpartId: 'author',
};

describe('planGain', () => {
  it('répartit les 10 points d’une validation entre les étiquettes (4, 3, 3)', () => {
    const plan = planGain(accepted, 0);
    expect(plan).toMatchObject({ requested: 10, granted: 10 });
    expect(plan.events.map((e) => [e.tagId, e.points])).toEqual([
      ['docker', 4],
      ['nginx', 3],
      ['node', 3],
    ]);
    expect(plan.events[0]).toMatchObject({
      userId: 'helper',
      kind: 'answer_accepted',
      counterpartId: 'author',
    });
  });

  it('n’attribue que ce qui reste sous le plafond quotidien', () => {
    const plan = planGain(accepted, 55);
    expect(plan).toMatchObject({ requested: 10, granted: 5 });
    expect(plan.events.map((e) => e.points)).toEqual([2, 2, 1]);
  });

  it('n’attribue rien une fois le plafond atteint', () => {
    expect(planGain(accepted, 60)).toEqual({ events: [], requested: 10, granted: 0 });
  });

  it('ignore le plafond pour le bonus de vitesse', () => {
    const plan = planGain({ ...accepted, kind: 'answer_fast_bonus' }, 60);
    expect(plan).toMatchObject({ requested: 3, granted: 3 });
    expect(plan.events.map((e) => e.points)).toEqual([1, 1, 1]);
  });

  it('crée un seul événement sans étiquette quand il n’y en a pas', () => {
    const plan = planGain(
      { ...accepted, kind: 'question_resolved', sourceType: 'question', tagIds: [] },
      0,
    );
    expect(plan.events).toEqual([
      expect.objectContaining({ tagId: null, points: 1, kind: 'question_resolved' }),
    ]);
  });

  it('ne crée pas d’événement à zéro point', () => {
    const plan = planGain({ ...accepted, kind: 'answer_helpful_vote' }, 0);
    expect(plan.events.map((e) => [e.tagId, e.points])).toEqual([
      ['docker', 1],
      ['nginx', 1],
    ]);
  });
});
