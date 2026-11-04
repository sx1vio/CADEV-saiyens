import { Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { IdentityModule } from '../identity';
import { type PreflightProbes, RunPreflight } from './application/run-preflight';
import { PreflightController } from './http/preflight.controller';
import { PreflightRepository } from './infrastructure/preflight.repository';
import { GithubRateLimitedError, probeRepo, RepoNotFoundError } from './infrastructure/repo.probe';
import { SafeFetcher, UnsafeTargetError } from './infrastructure/safe-fetch';
import { probeSite, SiteUnreachableError } from './infrastructure/site.probe';

// Pré-vol (« du prompt à la prod vérifiée ») : sécurité, réseau lent, dépendances et licences
// d'une application en ligne et de son dépôt, avec un rapport lisible par l'IA du développeur.
@Module({
  imports: [IdentityModule],
  controllers: [PreflightController],
  providers: [
    PreflightRepository,
    {
      provide: RunPreflight,
      inject: [PreflightRepository, ENV],
      useFactory: (store: PreflightRepository, env: Env) => {
        const probes: PreflightProbes = {
          site: (url, signal) => probeSite(new SafeFetcher(signal), url, env.SYSTALINK_IP_RANGES),
          repo: (repo, signal) =>
            probeRepo(new SafeFetcher(signal), repo, env.PREFLIGHT_GITHUB_TOKEN),
          classify: (err) =>
            err instanceof SiteUnreachableError || err instanceof UnsafeTargetError
              ? 'site_unreachable'
              : err instanceof RepoNotFoundError
                ? 'repo_not_found'
                : err instanceof GithubRateLimitedError
                  ? 'github_rate_limited'
                  : 'other',
        };
        return new RunPreflight(probes, store);
      },
    },
  ],
})
export class PreflightModule {}
