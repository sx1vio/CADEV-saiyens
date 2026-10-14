import { describe, expect, it } from 'vitest';
import { TAG_REFERENCE } from './tags';

describe('TAG_REFERENCE', () => {
  it('slugs uniques, au format des étiquettes (minuscules, chiffres, tirets)', () => {
    const slugs = TAG_REFERENCE.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(TAG_REFERENCE.length).toBeGreaterThanOrEqual(50);
  });

  it('chaque étiquette a un libellé', () => {
    for (const t of TAG_REFERENCE) expect(t.label.trim()).not.toBe('');
  });
});
