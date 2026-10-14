import { describe, expect, it } from 'vitest';
import { type StoredCheck, backupIsFresh, stateOf, summarize } from './status';

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
