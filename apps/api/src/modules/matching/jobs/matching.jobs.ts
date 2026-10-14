import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { MATCHING } from '@devhub/core';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { RunWave } from '../application/run-wave';

/** Handlers de matching.run (vague 1) et matching.escalate (vague 2), dans le worker seulement. */
@Injectable()
export class MatchingJobs implements OnApplicationBootstrap {
  private readonly logger = new Logger(MatchingJobs.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobQueue,
    private readonly runWave: RunWave,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'worker') return;
    await this.jobs.work(JOBS.matchingRun, (data) => this.first(data.questionId));
    await this.jobs.work(JOBS.matchingEscalate, (data) => this.escalate(data.questionId));
  }

  async first(questionId: string): Promise<void> {
    const outcome = await this.runWave.first(questionId);
    this.logger.log({ questionId, outcome: outcome.kind }, 'Matching, vague 1');
    if (outcome.kind !== 'skipped') {
      await this.jobs.send(
        JOBS.matchingEscalate,
        { questionId },
        `escalate:${questionId}`,
        MATCHING.escalateAfterMinutes * 60,
      );
    }
  }

  async escalate(questionId: string): Promise<void> {
    const outcome = await this.runWave.escalate(questionId);
    this.logger.log({ questionId, outcome: outcome.kind }, 'Matching, vague 2');
  }
}
