import { describe, expect, it } from 'vitest';
import { handleCandidates, handleFromLogin } from './handle';

describe('handleFromLogin', () => {
  it('met en minuscules et garde lettres, chiffres et tirets', () => {
    expect(handleFromLogin('Awa-Dev')).toBe('awa-dev');
    expect(handleFromLogin('moussa_dakar.2026')).toBe('moussa-dakar-2026');
  });

  it('ne laisse ni tiret au début ou à la fin, ni tirets doublés', () => {
    expect(handleFromLogin('--kwame__a--')).toBe('kwame-a');
  });

  it('a une valeur de repli et une longueur maximale', () => {
    expect(handleFromLogin('___')).toBe('dev');
    expect(handleFromLogin('a'.repeat(60))).toHaveLength(39);
  });
});

describe('handleCandidates', () => {
  it('propose le pseudo, puis -2 à -9, puis un suffixe aléatoire', () => {
    const it = handleCandidates('awa', () => 'x1y2');
    const first = Array.from({ length: 10 }, () => it.next().value);
    expect(first).toEqual([
      'awa',
      'awa-2',
      'awa-3',
      'awa-4',
      'awa-5',
      'awa-6',
      'awa-7',
      'awa-8',
      'awa-9',
      'awa-x1y2',
    ]);
  });

  it('respecte la longueur maximale avec les suffixes', () => {
    const it = handleCandidates('a'.repeat(39), () => 'x1y2');
    it.next();
    expect(it.next().value).toHaveLength(39);
  });
});
