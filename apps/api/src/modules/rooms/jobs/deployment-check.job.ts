import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { Deployments } from '../application/deployments';

/** Idée A : sonde les applications en production toutes les 30 minutes (worker uniquement). */
@Injectable()
export class DeploymentCheckJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(DeploymentCheckJob.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobQueue,
    private readonly deployments: Deployments,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'worker') return;
    await this.jobs.work(JOBS.deploymentCheck, async () => {
      const { checked, up } = await this.deployments.checkAll();
      if (checked > up)
        this.logger.warn({ checked, up }, 'Applications en production injoignables');
    });
    await this.jobs.schedule(JOBS.deploymentCheck);
  }
}
