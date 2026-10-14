import { pool } from '../domain/pool';
import type { NewsCollectors, NewsRepository } from '../domain/ports';

export interface IngestResult {
  sourcesOk: number;
  failed: { source: string; error: string }[];
  items: number;
  seconds: number;
}

const KEEP_DAYS = 45;

/**
 * Une passe de collecte. Idempotente : un même lien n'est stocké qu'une fois (compteurs mis à jour).
 * `github` : dépôts de la semaine et nouvelles versions (limite de l'API GitHub, une passe par heure).
 */
export class IngestNews {
  constructor(
    private readonly repo: NewsRepository,
    private readonly collectors: NewsCollectors,
  ) {}

  async execute(opts: { github: boolean }): Promise<IngestResult> {
    const t0 = Date.now();
    const runId = await this.repo.startRun();
    const failed: IngestResult['failed'] = [];
    let sourcesOk = 0;
    let items = 0;
    try {
      const jobs = opts.github ? this.collectors.github() : this.collectors.feeds();
      const results = await pool(jobs, 6, (j) => j.run());
      for (const [i, r] of results.entries()) {
        if (r.status === 'fulfilled') {
          sourcesOk++;
          items += await this.repo.upsert(r.value);
        } else {
          const reason = r.reason as Error | undefined;
          failed.push({ source: jobs[i]!.source, error: String(reason?.message ?? reason) });
        }
      }

      if (!opts.github) {
        // Images manquantes : balise Open Graph de l'article (limité pour rester poli avec les sites)
        const missing = await this.repo.missingImages(60);
        await pool(missing, 6, async (m) =>
          this.repo.setImage(m.id, await this.collectors.ogImage(m.url).catch(() => null)),
        );
        await this.repo.purgeOlderThan(KEEP_DAYS);
      }
    } finally {
      await this.repo.finishRun(runId, { items, sourcesOk, errors: failed });
    }
    return { sourcesOk, failed, items, seconds: Math.round((Date.now() - t0) / 1000) };
  }
}
