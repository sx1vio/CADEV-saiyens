import type {
  PreflightCheck,
  PreflightMetrics,
  PreflightRepoSummary,
  PreflightReport,
} from '@devhub/contracts';
import { PREFLIGHT_HOURLY_QUOTA } from '@devhub/contracts';
import { repoChecks, siteChecks, siteUnreachableCheck } from '../domain/checks';
import type { RepoFacts, SiteFacts } from '../domain/facts';
import { estimateLoad } from '../domain/network';
import { countChecks, scoreOf, sortChecks, verdictOf } from '../domain/report';

export class PreflightQuotaError extends Error {}
export class PreflightBusyError extends Error {}
/** Ni le site ni le dépôt n'ont pu être analysés. */
export class NothingToCheckError extends Error {
  constructor(readonly reason: 'site_unreachable' | 'repo_not_found' | 'github_rate_limited') {
    super(reason);
  }
}

export interface PreflightProbes {
  site(url: string, signal: AbortSignal): Promise<SiteFacts>;
  repo(fullName: string, signal: AbortSignal): Promise<RepoFacts>;
  /** Classe une erreur de sonde (site injoignable, dépôt introuvable…). */
  classify(err: unknown): 'site_unreachable' | 'repo_not_found' | 'github_rate_limited' | 'other';
}

export interface PreflightStore {
  countSince(userId: string, since: Date): Promise<number>;
  save(input: {
    userId: string;
    url: string | null;
    repo: string | null;
    score: number;
    verdict: string;
    durationMs: number;
    result: Pick<PreflightReport, 'checks' | 'metrics' | 'repoSummary' | 'counts'>;
  }): Promise<string>;
}

const BUDGET_MS = 45_000;

export class RunPreflight {
  private readonly running = new Set<string>();

  constructor(
    private readonly probes: PreflightProbes,
    private readonly store: PreflightStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(input: { userId: string; url: string | null; repo: string | null }): Promise<string> {
    if (this.running.has(input.userId)) throw new PreflightBusyError();
    const hourAgo = new Date(this.now().getTime() - 3_600_000);
    if ((await this.store.countSince(input.userId, hourAgo)) >= PREFLIGHT_HOURLY_QUOTA) {
      throw new PreflightQuotaError();
    }
    this.running.add(input.userId);
    try {
      return await this.execute(input);
    } finally {
      this.running.delete(input.userId);
    }
  }

  private async execute(input: { userId: string; url: string | null; repo: string | null }) {
    const started = Date.now();
    const signal = AbortSignal.timeout(BUDGET_MS);
    const [site, repo] = await Promise.all([
      input.url ? this.probes.site(input.url, signal).catch((e: unknown) => e) : null,
      input.repo ? this.probes.repo(input.repo, signal).catch((e: unknown) => e) : null,
    ]);

    const checks: PreflightCheck[] = [];
    let metrics: PreflightMetrics | null = null;
    let repoSummary: PreflightRepoSummary | null = null;

    const siteOk = site !== null && !(site instanceof Error) && typeof site === 'object';
    const repoOk = repo !== null && !(repo instanceof Error) && typeof repo === 'object';

    if (input.url && !siteOk) {
      const kind = this.probes.classify(site);
      if (!repoOk) throw new NothingToCheckError('site_unreachable');
      checks.push(
        siteUnreachableCheck(
          input.url,
          kind === 'site_unreachable'
            ? 'adresse privée, introuvable ou sans réponse'
            : 'erreur réseau',
        ),
      );
    }
    if (input.repo && !repoOk) {
      const kind = this.probes.classify(repo);
      if (!siteOk) {
        throw new NothingToCheckError(
          kind === 'github_rate_limited' ? 'github_rate_limited' : 'repo_not_found',
        );
      }
      checks.push({
        id: 'repo.unreachable',
        category: 'dependencies',
        status: 'info',
        title: kind === 'github_rate_limited' ? 'GitHub limite les requêtes' : 'Dépôt introuvable',
        detail:
          kind === 'github_rate_limited'
            ? 'Le quota de l’API GitHub est épuisé pour l’instant : relancer le pré-vol plus tard pour analyser le dépôt.'
            : `github.com/${input.repo} n’existe pas ou n’est pas public.`,
        fix: null,
        evidence: [],
      });
    }

    if (siteOk) {
      const s = site as SiteFacts;
      checks.push(...siteChecks(s));
      const load = estimateLoad(s);
      metrics = {
        finalUrl: s.finalUrl,
        status: s.status,
        ttfbMs: s.ttfbMs,
        requests: load.requests,
        totalBytes: load.totalBytes,
        criticalBytes: load.criticalBytes,
        estimated3gMs: load.estimated3gMs,
        hostIps: s.hostIps,
        hostedOnSystalink: s.hostedOnSystalink,
      };
    }
    if (repoOk) {
      const r = repo as RepoFacts;
      checks.push(...repoChecks(r));
      repoSummary = {
        fullName: r.fullName,
        defaultBranch: r.defaultBranch,
        licence: r.licence,
        ecosystems: r.ecosystems,
        dependencies: r.dependencies,
        vulnerablePackages: r.vulnerable.length,
      };
    }

    const sorted = sortChecks(checks);
    return this.store.save({
      userId: input.userId,
      url: input.url,
      repo: repoOk ? (repo as RepoFacts).fullName : input.repo,
      score: scoreOf(sorted),
      verdict: verdictOf(sorted),
      durationMs: Date.now() - started,
      result: { checks: sorted, metrics, repoSummary, counts: countChecks(sorted) },
    });
  }
}
