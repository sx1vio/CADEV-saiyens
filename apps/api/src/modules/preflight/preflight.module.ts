import { Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { IdentityModule } from '../identity';
import { type PreflightProbes, RunPreflight } from './application/run-preflight';
import { McpController } from './http/mcp.controller';
import { PreflightController } from './http/preflight.controller';
import { PreflightRepository } from './infrastructure/preflight.repository';
import { GithubRateLimitedError, probeRepo, RepoNotFoundError } from './infrastructure/repo.probe';
import { SafeFetcher, UnsafeTargetError } from './infrastructure/safe-fetch';
import { probeDomain } from './infrastructure/domain.probe';
import { probeSite, SiteUnreachableError } from './infrastructure/site.probe';
import { probeLighthouse } from './infrastructure/lighthouse.probe';
import { httpHit, runLoadStages } from './infrastructure/load-runner';
import { verifyOwnership } from './infrastructure/ownership.probe';
import { ownershipInstructions } from './domain/ownership';
import { PREFLIGHT_LOAD_LIMITS } from '@devhub/contracts';

// Pré-vol (« du prompt à la prod vérifiée ») : sécurité, réseau lent, dépendances et licences
// d'une application en ligne et de son dépôt, avec un rapport lisible par l'IA du développeur.
@Module({
  imports: [IdentityModule],
  controllers: [PreflightController, McpController],
  providers: [
    PreflightRepository,
    {
      provide: RunPreflight,
      inject: [PreflightRepository, ENV],
      useFactory: (store: PreflightRepository, env: Env) => {
        const probes: PreflightProbes = {
          site: (url, signal, opts) =>
            probeSite(new SafeFetcher(signal), url, env.SYSTALINK_IP_RANGES, opts),
          domain: (url, signal) => probeDomain(new SafeFetcher(signal), url),
          repo: (repo, signal) =>
            probeRepo(new SafeFetcher(signal), repo, env.PREFLIGHT_GITHUB_TOKEN),
          lighthouse: (url) => probeLighthouse(url, env.PAGESPEED_API_KEY),
          ownership: (userId, url) =>
            verifyOwnership(
              new SafeFetcher(AbortSignal.timeout(15_000)),
              ownershipInstructions(env.SESSION_SECRET, userId, url),
            ),
          loadTest: (url) => {
            const budget =
              PREFLIGHT_LOAD_LIMITS.stages.length * PREFLIGHT_LOAD_LIMITS.stageMs +
              PREFLIGHT_LOAD_LIMITS.requestTimeoutMs +
              5_000;
            return runLoadStages(httpHit(new SafeFetcher(AbortSignal.timeout(budget)), url));
          },
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
