import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { JOBS } from '../../../infrastructure/jobs/catalog';
import { JobQueue } from '../../../infrastructure/jobs/job-queue';
import { GithubApiError } from '../../github';
import { GithubNotLinkedError, ImportGithubProfile } from '../application/import-github-profile';

/** Handler du job github.import-profile, enregistré dans le process worker seulement. */
@Injectable()
export class ImportProfileJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(ImportProfileJob.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobQueue,
    private readonly importer: ImportGithubProfile,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.PROCESS_ROLE !== 'worker') return;
    await this.jobs.work(JOBS.githubImportProfile, (data) => this.handle(data.userId));
  }

  async handle(userId: string): Promise<void> {
    try {
      const summary = await this.importer.execute(userId);
      this.logger.log({ userId, ...summary }, 'Profil GitHub importé');
    } catch (err) {
      // Compte sans GitHub (supprimé entre-temps) ou jeton révoqué : réessayer ne sert à rien.
      // L'utilisateur relancera l'import après s'être reconnecté (POST /me/github/refresh).
      if (err instanceof GithubNotLinkedError) return;
      if (err instanceof GithubApiError && err.tokenRevoked) {
        this.logger.warn({ userId }, 'Jeton GitHub révoqué : import abandonné');
        return;
      }
      throw err; // pg-boss réessaie (3 fois, avec délai croissant), y compris après un quota épuisé
    }
  }
}
