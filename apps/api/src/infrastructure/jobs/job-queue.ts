import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { JOBS, type JobDefinition, type JobPayload } from './catalog';

// File de tâches pg-boss (ADR-0006). Le process http ne fait qu'envoyer ; le worker
// assure en plus la maintenance et consomme les jobs.
@Injectable()
export class JobQueue implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(JobQueue.name);
  private readonly boss: PgBoss;

  constructor(@Inject(ENV) env: Env) {
    const isWorker = env.PROCESS_ROLE === 'worker';
    this.boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: 'pgboss',
      supervise: isWorker,
      schedule: isWorker,
    });
    this.boss.on('error', (err) => this.logger.error({ err }, 'pg-boss'));
  }

  async onModuleInit(): Promise<void> {
    await this.boss.start();
    for (const job of Object.values(JOBS)) await this.boss.createQueue(job.name);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.boss.stop({ graceful: true });
  }

  async send<J extends JobDefinition>(
    job: J,
    data: JobPayload<J>,
    singletonKey?: string,
    /** Exécution différée (ex. escalade à 15 minutes). */
    startAfterSeconds?: number,
  ): Promise<void> {
    await this.boss.send(job.name, job.payload.parse(data) as object, {
      ...job.options,
      ...(singletonKey ? { singletonKey } : {}),
      ...(startAfterSeconds ? { startAfter: startAfterSeconds } : {}),
    });
  }

  /** Enregistre un handler (worker uniquement). Chaque job est validé avant traitement. */
  async work<J extends JobDefinition>(
    job: J,
    handler: (data: JobPayload<J>) => Promise<void>,
  ): Promise<void> {
    await this.boss.work<unknown>(job.name, async (jobs) => {
      for (const j of jobs) await handler(job.payload.parse(j.data) as JobPayload<J>);
    });
  }
}
