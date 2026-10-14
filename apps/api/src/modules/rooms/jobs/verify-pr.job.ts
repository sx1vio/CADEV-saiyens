import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { publishToTopic } from '../../../infrastructure/realtime/realtime.publisher';
import { GithubPrVerifier } from '../infrastructure/github-pr.verifier';

/**
 * R9 : GitHub ne répondait pas à la clôture. La tâche est restée « déclarée » ; si la PR est
 * bien fusionnée par l'assigné, elle devient « Vérifiée par GitHub ». Les XP ont déjà été
 * attribués à la clôture : rien ne change de ce côté.
 */
@Injectable()
export class VerifyPrJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(VerifyPrJob.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobQueue,
    private readonly github: GithubPrVerifier,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'worker') return;
    await this.jobs.work(JOBS.githubVerifyPr, (data) => this.handle(data.taskId, data.actorId));
  }

  async handle(taskId: string, actorId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true, verification: true, prUrl: true, assigneeId: true, roomId: true },
    });
    if (!task || task.status !== 'done' || task.verification !== 'declared' || !task.prUrl) return;
    const check = await this.github.check(actorId, task.prUrl, task.assigneeId);
    if (check.unavailable) throw new Error('GitHub toujours indisponible'); // pg-boss réessaie
    if (check.verification === 'github_verified') {
      await this.prisma.$transaction(async (tx) => {
        await tx.task.update({ where: { id: taskId }, data: { verification: 'github_verified' } });
        await publishToTopic(tx, `room:${task.roomId}`, 'task.updated', {
          taskId,
          roomId: task.roomId,
        });
      });
    }
    this.logger.log({ taskId, verification: check.verification }, 'Contribution revérifiée');
  }
}
