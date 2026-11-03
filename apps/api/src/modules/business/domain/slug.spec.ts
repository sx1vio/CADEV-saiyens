import { describe, expect, it } from 'vitest';
import { companySlug } from './slug';

describe('companySlug', () => {
  it.each([
    ['Wave Mobile Money', 'wave-mobile-money'],
    ['Société Générale Côte d’Ivoire', 'societe-generale-cote-d-ivoire'],
    ['  --  ', 'entreprise'],
  ])('%s → %s', (name, slug) => expect(companySlug(name)).toBe(slug));
});
