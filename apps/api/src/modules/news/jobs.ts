import { Inject, Injectable, Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { JOBS } from '../../infrastructure/jobs/catalog';
import { JobQueue } from '../../infrastructure/jobs/job-queue';
import { IngestNews, type IngestGroup } from './application/ingest-news';
import { NewsIngestModule } from './news.module';

/** Une collecte par rythme : flux 15 min, GitHub 1 h, emplois 6 h, certifications 1 j (catalogue : infrastructure/jobs/catalog.ts). */
@Injectable()
export class NewsJobs implements OnApplicationBootstrap {
  private readonly logger = new Logger(NewsJobs.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobQueue,
    private readonly ingest: IngestNews,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'worker') return;
    for (const [job, group] of [
      [JOBS.newsIngest, 'feeds'],
      [JOBS.newsIngestGithub, 'github'],
      [JOBS.newsIngestJobs, 'jobs'],
      [JOBS.newsIngestCerts, 'certs'],
    ] as const) {
      await this.jobs.schedule(job);
      await this.jobs.work(job, () => this.run(job.name, group));
      // Première collecte au démarrage : l'accueil n'attend pas le prochain quart d'heure.
      await this.jobs.send(job, {});
    }
  }

  private async run(job: string, group: IngestGroup): Promise<void> {
    const r = await this.ingest.execute({ group });
    this.logger.log(
      { job, sourcesOk: r.sourcesOk, failed: r.failed.length, items: r.items, seconds: r.seconds },
      'Collecte terminée',
    );
    if (r.failed.length) this.logger.warn({ job, failed: r.failed }, 'Sources en échec');
  }
}

/** Jobs de collecte, dans le worker seulement. */
@Module({ imports: [NewsIngestModule], providers: [NewsJobs] })
export class NewsJobsModule {}
