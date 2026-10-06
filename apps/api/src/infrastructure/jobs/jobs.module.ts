import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';

// File de tâches pg-boss (ADR-0006). Le catalogue des jobs viendra avec les modules métier.
export const JOB_QUEUE = Symbol('JOB_QUEUE');

@Global()
@Module({
  providers: [
    {
      provide: JOB_QUEUE,
      inject: [ENV],
      useFactory: (env: Env) =>
        new PgBoss({ connectionString: env.DATABASE_URL, schema: 'pgboss' }),
    },
  ],
  exports: [JOB_QUEUE],
})
export class JobsModule implements OnApplicationShutdown {
  constructor(@Inject(JOB_QUEUE) private readonly boss: PgBoss) {}

  async onApplicationShutdown(): Promise<void> {
    await this.boss.stop({ graceful: true });
  }
}
