import { describe, expect, it } from 'vitest';
import { isTechRole, opensToAfrica } from './jobs';

describe('opensToAfrica', () => {
  it.each([
    'Worldwide',
    'Anywhere',
    'EMEA,  LATAM',
    'Africa',
    'Nigeria, Kenya',
    'Lagos',
    'Remote',
    'Distributed',
  ])('retient %s', (l) => expect(opensToAfrica(l)).toBe(true));
  it.each([
    'USA',
    'Europe,  USA',
    'Canada,  Israel,  UK',
    'LATAM',
    'Remote - US',
    'Hybrid',
    'Paris, France',
  ])('écarte %s', (l) => expect(opensToAfrica(l)).toBe(false));
});

describe('isTechRole', () => {
  it('garde les métiers du numérique et écarte les autres', () => {
    expect(isTechRole('Senior Backend Engineer')).toBe(true);
    expect(isTechRole('Data Scientist, Growth')).toBe(true);
    expect(isTechRole('Account Executive, FedCiv')).toBe(false);
    expect(isTechRole('First Mile & Last Mile Manager')).toBe(false);
  });
});
