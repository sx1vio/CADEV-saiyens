import { Injectable, Logger } from '@nestjs/common';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import type { SignUpListener } from '../domain/ports';

/**
 * À l'inscription, l'import du profil GitHub part en tâche de fond (PR1, X3).
 * Un échec d'envoi ne doit pas faire échouer la connexion : l'import reste possible
 * via POST /api/v1/me/github/refresh.
 */
@Injectable()
export class EnqueueProfileImport implements SignUpListener {
  private readonly logger = new Logger(EnqueueProfileImport.name);

  constructor(private readonly jobs: JobQueue) {}

  async userSignedUp(userId: string): Promise<void> {
    try {
      await this.jobs.send(JOBS.githubImportProfile, { userId }, userId);
    } catch (err) {
      this.logger.error({ err, userId }, "Envoi du job d'import GitHub impossible");
    }
  }
}
