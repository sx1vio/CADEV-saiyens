import { describe, expect, it } from 'vitest';
import type { Probe, StatusStore } from '../domain/ports';
import type { ProbeResult } from '../domain/status';
import { CheckServices } from './check-services';

describe('CheckServices (Y1, Y5)', () => {
  it('enregistre toutes les sondes, même celle qui lève, et purge au-delà de 30 jours', async () => {
    const recorded: ProbeResult[] = [];
    let purgedBefore: Date | null = null;
    const store: StatusStore = {
      record: async (r) => void recorded.push(...r),
      purgeBefore: async (at) => {
        purgedBefore = at;
        return 0;
      },
      latest: async () => [],
    };
    const probes: Probe[] = [
      {
        service: 'database',
        probe: async () => ({ service: 'database', ok: true, latencyMs: 2, detail: null }),
      },
      {
        service: 'vps',
        probe: () => Promise.reject(new Error('connexion refusée')),
      },
    ];
    const now = new Date('2026-10-16T10:00:00Z');
    await new CheckServices(probes, store, () => now).run();
    expect(recorded).toEqual([
      { service: 'database', ok: true, latencyMs: 2, detail: null },
      { service: 'vps', ok: false, latencyMs: null, detail: { error: 'connexion refusée' } },
    ]);
    expect(purgedBefore).toEqual(new Date('2026-09-16T10:00:00Z'));
  });
});
