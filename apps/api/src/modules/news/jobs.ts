import { Inject, Injectable, Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { JOBS } from '../../infrastructure/jobs/catalog';
import { JobQueue } from '../../infrastructure/jobs/job-queue';
import { IngestNews } from './application/ingest-news';
import { NewsIngestModule } from './news.module';

/** Collecte toutes les 15 minutes, GitHub une fois par heure (catalogue : infrastructure/jobs/catalog.ts). */
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
    for (const [job, github] of [
      [JOBS.newsIngest, false],
      [JOBS.newsIngestGithub, true],
    ] as const) {
      await this.jobs.schedule(job);
      await this.jobs.work(job, () => this.run(job.name, github));
      // Première collecte au démarrage : l'accueil n'attend pas le prochain quart d'heure.
      await this.jobs.send(job, {});
    }
  }

  private async run(job: string, github: boolean): Promise<void> {
    const r = await this.ingest.execute({ github });
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
