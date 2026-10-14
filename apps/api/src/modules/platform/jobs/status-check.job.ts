import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { CheckServices } from '../application/check-services';

/** Y1, Y5 : planifie status.check (toutes les 5 min) et le traite, côté worker uniquement. */
@Injectable()
export class StatusCheckJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(StatusCheckJob.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobQueue,
    private readonly check: CheckServices,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'worker') return;
    await this.jobs.work(JOBS.statusCheck, async () => {
      const results = await this.check.run();
      const down = results.filter((r) => !r.ok && r.detail?.configured !== false);
      if (down.length > 0) this.logger.warn({ down }, 'Service Systalink en échec');
    });
    await this.jobs.schedule(JOBS.statusCheck);
  }
}
