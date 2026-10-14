import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { publishToTopic } from '../../../infrastructure/realtime/realtime.publisher';
import { GenerateHint } from '../application/generate-hint';

/** Handler du job ai.hint (S2), enregistré dans le process worker seulement. */
@Injectable()
export class AiHintJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiHintJob.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobQueue,
    private readonly generateHint: GenerateHint,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'worker') return;
    await this.jobs.work(JOBS.aiHint, (data) => this.handle(data.questionId));
  }

  async handle(questionId: string): Promise<void> {
    const outcome = await this.generateHint.execute(questionId);
    this.logger.log({ questionId, outcome }, 'Piste IA');
    // Y8 : la page de la question affiche la piste (ou l'échec) sans recharger.
    if (outcome !== 'ignored') {
      await publishToTopic(this.prisma, `question:${questionId}`, 'question.ai_hint', {
        questionId,
      });
    }
  }
}
