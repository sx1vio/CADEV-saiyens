import { describe, expect, it } from 'vitest';
import { HttpMetrics, percentile } from './http-metrics';

describe('HttpMetrics', () => {
  it('percentile : rang supérieur, null sans échantillon', () => {
    expect(percentile([], 95)).toBeNull();
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 95)).toBe(40);
  });

  it('compte erreurs et latences sur 5 min et 1 h, oublie ce qui a plus d’une heure', () => {
    const m = new HttpMetrics();
    const now = Date.parse('2026-11-09T12:00:00Z');
    const at = (minAgo: number) => now - minAgo * 60_000;
    m.record({ at: at(90), method: 'GET', route: 'GET /old', status: 500, ms: 999 });
    m.record({ at: at(30), method: 'GET', route: 'GET /a', status: 200, ms: 10 });
    m.record({ at: at(2), method: 'GET', route: 'GET /a', status: 404, ms: 20 });
    m.record({ at: at(1), method: 'POST', route: 'POST /b', status: 503, ms: 300 });
    const s = m.snapshot(now);
    expect(s.lastHour).toMatchObject({ requests: 3, clientErrors: 1, serverErrors: 1, p95Ms: 300 });
    expect(s.last5m).toMatchObject({ requests: 2, serverErrors: 1 });
    expect(s.slowestRoutes[0]).toMatchObject({ route: 'POST /b', serverErrors: 1, p95Ms: 300 });
    expect(s.slowestRoutes.map((r) => r.route)).not.toContain('GET /old');
  });

  it('garde les 30 dernières erreurs serveur, la plus récente en tête', () => {
    const m = new HttpMetrics();
    for (let i = 0; i < 35; i++)
      m.recordError({
        at: new Date(i).toISOString(),
        method: 'GET',
        path: `/${i}`,
        requestId: null,
        message: 'x',
      });
    const { recentErrors } = m.snapshot();
    expect(recentErrors).toHaveLength(30);
    expect(recentErrors[0]!.path).toBe('/34');
  });
});
