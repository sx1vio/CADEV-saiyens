import { Logger } from '@nestjs/common';
import type { PgBoss } from 'pg-boss';
import type { IngestNews } from './application/ingest-news';

// Catalogue des jobs du module (docs/architecture/07-taches-fond-temps-reel.md).
export const NEWS_INGEST = 'news.ingest';
export const NEWS_INGEST_GITHUB = 'news.ingest-github';

/** Collecte toutes les 15 minutes, GitHub une fois par heure (limite de 60 requêtes/heure sans jeton). */
export async function registerNewsJobs(boss: PgBoss, ingest: IngestNews): Promise<void> {
  const logger = new Logger('NewsJobs');
  for (const [name, cron, github] of [
    [NEWS_INGEST, '*/15 * * * *', false],
    [NEWS_INGEST_GITHUB, '5 * * * *', true],
  ] as const) {
    await boss.createQueue(name, { policy: 'exclusive' });
    await boss.schedule(name, cron);
    await boss.work(name, async () => {
      const r = await ingest.execute({ github });
      logger.log(
        {
          job: name,
          sourcesOk: r.sourcesOk,
          failed: r.failed.length,
          items: r.items,
          seconds: r.seconds,
        },
        'Collecte terminée',
      );
      if (r.failed.length) logger.warn({ job: name, failed: r.failed }, 'Sources en échec');
    });
    // Première collecte au démarrage : l'accueil n'attend pas le prochain quart d'heure.
    await boss.send(name, {});
  }
}
