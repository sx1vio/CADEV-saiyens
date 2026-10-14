import type { Probe, StatusStore } from '../domain/ports';
import type { ProbeResult } from '../domain/status';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Y1, Y5 : une passe de sondes (job status.check, toutes les 5 minutes).
export class CheckServices {
  constructor(
    private readonly probes: Probe[],
    private readonly store: StatusStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(): Promise<ProbeResult[]> {
    const results = await Promise.all(
      this.probes.map((p) =>
        p.probe().catch((err: unknown): ProbeResult => ({
          service: p.service,
          ok: false,
          latencyMs: null,
          detail: { error: err instanceof Error ? err.message : 'échec de la sonde' },
        })),
      ),
    );
    const now = this.now();
    await this.store.record(results, now);
    await this.store.purgeBefore(new Date(now.getTime() - RETENTION_MS));
    return results;
  }
}
