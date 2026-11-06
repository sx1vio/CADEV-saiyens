import { describe, expect, it } from 'vitest';
import { assertCanReport, assertCanReview, BenchError, coverage } from './rules';

const request = {
  authorId: 'awa',
  status: 'open' as const,
  maxTesters: 2,
  devices: ['android_low', 'iphone'],
  networks: ['3g', 'offline'],
};
const input = {
  testerId: 'moussa',
  device: 'android_low' as const,
  network: '3g' as const,
  activeReports: 0,
  alreadyReported: false,
};
const code = (fn: () => void) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof BenchError ? e.code : 'other';
  }
};

describe('Banc d’essai : qui peut rendre un rapport', () => {
  it('accepte un testeur sur un appareil et un réseau demandés', () => {
    expect(code(() => assertCanReport(request, input))).toBeNull();
  });

  it('refuse l’auteur, une demande fermée, un doublon et une demande complète', () => {
    expect(code(() => assertCanReport(request, { ...input, testerId: 'awa' }))).toBe(
      'bench.own_request',
    );
    expect(code(() => assertCanReport({ ...request, status: 'closed' }, input))).toBe(
      'bench.closed',
    );
    expect(code(() => assertCanReport(request, { ...input, alreadyReported: true }))).toBe(
      'bench.already_reported',
    );
    expect(code(() => assertCanReport(request, { ...input, activeReports: 2 }))).toBe('bench.full');
  });

  it('exige un appareil et un réseau qui font partie de la demande', () => {
    expect(code(() => assertCanReport(request, { ...input, device: 'desktop' }))).toBe(
      'bench.device_not_requested',
    );
    expect(code(() => assertCanReport(request, { ...input, network: 'wifi' }))).toBe(
      'bench.network_not_requested',
    );
  });

  it('réserve le jugement au demandeur, une seule fois', () => {
    expect(code(() => assertCanReview({ authorId: 'awa' }, { status: 'submitted' }, 'x'))).toBe(
      'bench.not_requester',
    );
    expect(code(() => assertCanReview({ authorId: 'awa' }, { status: 'confirmed' }, 'awa'))).toBe(
      'bench.already_reviewed',
    );
    expect(code(() => assertCanReview({ authorId: 'awa' }, { status: 'submitted' }, 'awa'))).toBe(
      null,
    );
  });
});

describe('Banc d’essai : couverture appareil × réseau', () => {
  it('garde le pire verdict par case et ignore les rapports refusés', () => {
    const cells = coverage([
      { device: 'android_low', network: '3g', verdict: 'works', status: 'confirmed' },
      { device: 'android_low', network: '3g', verdict: 'broken', status: 'submitted' },
      { device: 'android_low', network: '3g', verdict: 'issues', status: 'submitted' },
      { device: 'iphone', network: 'offline', verdict: 'broken', status: 'rejected' },
    ]);
    expect(cells).toEqual([{ device: 'android_low', network: '3g', reports: 3, worst: 'broken' }]);
  });
});
