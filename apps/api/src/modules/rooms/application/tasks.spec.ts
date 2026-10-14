import { describe, expect, it } from 'vitest';
import { levelFromLabels } from './tasks';

describe('levelFromLabels (import des issues, R2)', () => {
  it.each([
    [['good first issue'], 'first_step'],
    [['First-Timers-Only'], 'first_step'],
    [['easy'], 'easy'],
    [['beginner friendly'], 'easy'],
    [['hard'], 'hard'],
    [['complex'], 'hard'],
    [['bug'], 'medium'],
    [[], 'medium'],
  ] as const)('%j → %s', (labels, level) => {
    expect(levelFromLabels([...labels])).toBe(level);
  });
});
