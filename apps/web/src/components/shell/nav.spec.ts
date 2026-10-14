import { describe, expect, it } from 'vitest';
import { isEcosystemPreview } from './nav';

describe('isEcosystemPreview (ADR-0020)', () => {
  it('signale les services sans API, pas les écrans du MVP ni les actualités', () => {
    for (const p of [
      '/communautes',
      '/c/devs-abidjan',
      '/emplois',
      '/emplois/42',
      '/post/1',
      '/creer',
    ]) {
      expect(isEcosystemPreview(p)).toBe(true);
    }
    for (const p of [
      '/',
      '/sos',
      '/projets',
      '/videos',
      '/u/awa',
      '/creerx',
      '/emploisx',
      '/systalink',
    ]) {
      expect(isEcosystemPreview(p)).toBe(false);
    }
  });
});
