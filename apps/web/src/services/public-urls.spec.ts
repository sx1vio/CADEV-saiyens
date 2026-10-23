import { describe, expect, it } from 'vitest';
import { proofCardUrl } from './public-urls';

describe('images publiques (PR5)', () => {
  it('Proof Card : même origine, langue, téléchargement facultatif, handle encodé', () => {
    expect(proofCardUrl('awa', 'fr')).toBe('/og/u/awa.png?lang=fr');
    expect(proofCardUrl('awa', 'en', true)).toBe('/og/u/awa.png?lang=en&download=1');
    expect(proofCardUrl('a/b', 'fr')).toBe('/og/u/a%2Fb.png?lang=fr');
  });
});
