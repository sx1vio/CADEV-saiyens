import { describe, expect, it } from 'vitest';
import { type StoredCheck, backupIsFresh, history, stateOf, summarize } from './status';

const now = new Date('2026-10-16T10:00:00Z');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const check = (over: Partial<StoredCheck>): StoredCheck => ({
  service: 'database',
  ok: true,
  latencyMs: 3,
  detail: null,
  checkedAt: minutesAgo(2),
  ...over,
});

describe('stateOf (Y1)', () => {
  it('opérationnel, en panne, non branché, inconnu', () => {
    expect(stateOf(check({}), now)).toBe('operational');
    expect(stateOf(check({ ok: false }), now)).toBe('down');
    expect(stateOf(check({ ok: false, detail: { configured: false } }), now)).toBe(
      'not_configured',
    );
    expect(stateOf(undefined, now)).toBe('unknown');
    expect(stateOf(check({ checkedAt: minutesAgo(16) }), now)).toBe('unknown');
  });
});

describe('backupIsFresh', () => {
  it('moins de 26 h : à jour ; plus vieux, futur ou illisible : non', () => {
    expect(backupIsFresh(minutesAgo(25 * 60).toISOString(), now)).toBe(true);
    expect(backupIsFresh(minutesAgo(27 * 60).toISOString(), now)).toBe(false);
    expect(backupIsFresh(minutesAgo(-60).toISOString(), now)).toBe(false);
    expect(backupIsFresh('hier', now)).toBe(false);
    expect(backupIsFresh(undefined, now)).toBe(false);
  });
});

describe('summarize', () => {
  it('tous les services dans un ordre fixe ; une panne dégrade, un service non branché non', () => {
    const lastBackupAt = minutesAgo(60).toISOString();
    const ok = summarize(
      [
        check({ service: 'vps' }),
        check({ service: 'database' }),
        check({ service: 'backup', detail: { lastBackupAt } }),
        check({ service: 'mail', ok: false, latencyMs: null, detail: { configured: false } }),
      ],
      now,
    );
    expect(ok.overall).toBe('operational');
    expect(ok.lastBackupAt).toBe(lastBackupAt);
    expect(ok.services.map((s) => [s.service, s.state])).toEqual([
      ['vps', 'operational'],
      ['database', 'operational'],
      ['backup', 'operational'],
      ['mail', 'not_configured'],
    ]);

    const down = summarize([check({ service: 'database', ok: false })], now);
    expect(down.overall).toBe('degraded');
    expect(down.lastBackupAt).toBeNull();
    expect(summarize([], now)).toMatchObject({ overall: 'unknown', lastBackupAt: null });
  });
});

describe('history (Y5)', () => {
  it('chaque jour de la période, jours sans sonde à null, disponibilité à une décimale', () => {
    const h = history(
      [
        { service: 'vps', date: '2026-10-15', total: 288, ok: 287 },
        { service: 'vps', date: '2026-10-16', total: 3, ok: 2 },
        { service: 'vps', date: '2026-10-01', total: 10, ok: 0 }, // hors période
      ],
      3,
      now,
    );
    const vps = h.services.find((s) => s.service === 'vps')!;
    expect(vps.daily).toEqual([
      { date: '2026-10-14', uptimePercent: null, checks: 0 },
      { date: '2026-10-15', uptimePercent: 99.7, checks: 288 },
      { date: '2026-10-16', uptimePercent: 66.7, checks: 3 },
    ]);
    expect(vps).toMatchObject({ uptimePercent: 99.3, checks: 291 });
    expect(h.services.map((s) => s.service)).toEqual(['vps', 'database', 'backup', 'mail']);
    expect(h.services[3]).toMatchObject({ uptimePercent: null, checks: 0 });
  });
});
