import { describe, expect, it } from 'vitest';
import { bucket, metricValue } from './AfricaMap';
import { AFRICA_SHAPES } from './shapes';

describe('carte de l’Afrique (D4)', () => {
  it('les 54 États membres de l’Union africaine ont une forme, avec un code ISO unique', () => {
    const codes = AFRICA_SHAPES.flatMap((s) => (s.code ? [s.code] : []));
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of ['CI', 'SN', 'NG', 'KE', 'ZA', 'EG', 'MA', 'CV', 'MU', 'SC', 'KM', 'ST'])
      expect(codes).toContain(c);
    expect(codes.length).toBeGreaterThanOrEqual(54);
  });

  it('paliers : 0 sans donnée, puis quatre classes relatives au maximum', () => {
    expect(bucket(0, 10)).toBe(0);
    expect(bucket(5, 0)).toBe(0);
    expect(bucket(1, 10)).toBe(1);
    expect(bucket(4, 10)).toBe(2);
    expect(bucket(6, 10)).toBe(3);
    expect(bucket(10, 10)).toBe(4);
  });

  it('devs actifs, ou devs inscrits quand l’activité n’est pas mesurée (serveur local)', () => {
    const row = { country: 'SN', devs: 8, activeDevs: 3, unblocked: 2, xp: 120 };
    expect(metricValue(row, 'active')).toBe(3);
    expect(metricValue(row, 'xp')).toBe(120);
    expect(metricValue({ ...row, activeDevs: null }, 'active')).toBe(8);
  });
});
