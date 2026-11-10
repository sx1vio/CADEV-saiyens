import type {
  PreflightCheck,
  PreflightLighthouse,
  PreflightLoadStage,
  PreflightLoadTest,
  PreflightMetrics,
  PreflightRepoSummary,
  PreflightReport,
  PreflightSystalinkAdvice,
  SystalinkHosting,
} from '@devhub/contracts';
import { PREFLIGHT_HOURLY_QUOTA, PREFLIGHT_LOAD_HOURLY_QUOTA } from '@devhub/contracts';
import { repoChecks, siteChecks, siteUnreachableCheck } from '../domain/checks';
import {
  architectureChecks,
  domainChecks,
  projectChecks,
  siteExtraChecks,
} from '../domain/extended-checks';
import { lighthouseChecks } from '../domain/lighthouse';
import { recetteSiteChecks } from '../domain/recette-checks';
import { concludeLoad, loadChecks } from '../domain/load';
import type { DomainFacts, RepoFacts, SiteFacts } from '../domain/facts';
import { declaredButUnseen, planCheck, systalinkAdvice } from '../domain/hosting';
import { estimateLoad } from '../domain/network';
import { countChecks, scoreOf, sortChecks, verdictOf } from '../domain/report';

export class PreflightQuotaError extends Error {}
export class PreflightBusyError extends Error {}
/** Test de charge demandé sans preuve de propriété du domaine. */
export class OwnershipRequiredError extends Error {}
/** Test de charge : quota horaire atteint, ou un autre test tourne déjà sur le serveur. */
export class LoadTestQuotaError extends Error {}
export class LoadTestBusyError extends Error {}
export class LoadTestNeedsUrlError extends Error {}
/** Ni le site ni le dépôt n'ont pu être analysés. */
export class NothingToCheckError extends Error {
  constructor(readonly reason: 'site_unreachable' | 'repo_not_found' | 'github_rate_limited') {
    super(reason);
  }
}

export interface PreflightProbes {
  /**
   * `owned` : l'auteur a prouvé qu'il contrôle le domaine. Sans preuve, la sonde ne lance pas la
   * matrice des routes d'API en anonyme (elle servirait à repérer le site d'un autre).
   */
  site(url: string, signal: AbortSignal, opts?: { owned?: boolean }): Promise<SiteFacts>;
  repo(fullName: string, signal: AbortSignal): Promise<RepoFacts>;
  /** Certificat TLS et DNS du domaine. Facultatif : absent, le rapport s'en passe. */
  domain?(url: string, signal: AbortSignal): Promise<DomainFacts>;
  /** Lighthouse réel (PageSpeed Insights). Facultatif : absent, le rapport s'en passe. */
  lighthouse?(url: string): Promise<PreflightLighthouse>;
  /** Preuve de propriété du domaine de `url` pour ce compte. */
  ownership?(userId: string, url: string): Promise<'well-known' | 'dns' | null>;
  /** Montée en charge par paliers sur `url`. */
  loadTest?(url: string): Promise<PreflightLoadStage[]>;
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
    result: Pick<
      PreflightReport,
      | 'checks'
      | 'metrics'
      | 'repoSummary'
      | 'counts'
      | 'lighthouse'
      | 'loadTest'
      | 'systalink'
      | 'architecture'
    >;
  }): Promise<string>;
}

const BUDGET_MS = 60_000;

type RunInput = {
  userId: string;
  url: string | null;
  repo: string | null;
  loadTest?: boolean;
  /** Offre Systalink déclarée par le développeur. */
  systalink?: SystalinkHosting | null;
};

export class RunPreflight {
  private readonly running = new Set<string>();
  /** Un seul test de charge à la fois sur tout le serveur : la machine reste disponible pour tous. */
  private loadBusy = false;
  private readonly loadRuns = new Map<string, number[]>();

  constructor(
    private readonly probes: PreflightProbes,
    private readonly store: PreflightStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(input: RunInput): Promise<string> {
    if (this.running.has(input.userId)) throw new PreflightBusyError();
    const hourAgo = new Date(this.now().getTime() - 3_600_000);
    if ((await this.store.countSince(input.userId, hourAgo)) >= PREFLIGHT_HOURLY_QUOTA) {
      throw new PreflightQuotaError();
    }
    let proof: 'well-known' | 'dns' | null = null;
    if (input.loadTest) {
      if (!input.url || !this.probes.loadTest || !this.probes.ownership) {
        throw new LoadTestNeedsUrlError();
      }
      const recent = (this.loadRuns.get(input.userId) ?? []).filter((t) => t > hourAgo.getTime());
      if (recent.length >= PREFLIGHT_LOAD_HOURLY_QUOTA) throw new LoadTestQuotaError();
      if (this.loadBusy) throw new LoadTestBusyError();
      proof = await this.probes.ownership(input.userId, input.url);
      if (!proof) throw new OwnershipRequiredError();
    }
    // Preuve de propriété aussi sans test de charge : elle ouvre la matrice d'API de la recette.
    const owned =
      proof ??
      (input.url && this.probes.ownership
        ? await this.probes.ownership(input.userId, input.url).catch(() => null)
        : null);
    this.running.add(input.userId);
    try {
      return await this.execute(input, proof, owned !== null);
    } finally {
      this.running.delete(input.userId);
    }
  }

  private async runLoad(userId: string, url: string): Promise<PreflightLoadStage[] | null> {
    if (this.loadBusy || !this.probes.loadTest) return null;
    this.loadBusy = true;
    const runs = this.loadRuns.get(userId) ?? [];
    runs.push(this.now().getTime());
    this.loadRuns.set(userId, runs.slice(-10));
    try {
      return await this.probes.loadTest(url);
    } catch {
      return null;
    } finally {
      this.loadBusy = false;
    }
  }

  private async execute(input: RunInput, proof: 'well-known' | 'dns' | null, owned = false) {
    const started = Date.now();
    const signal = AbortSignal.timeout(BUDGET_MS);
    const [site, repo, lighthouse, domain] = await Promise.all([
      input.url ? this.probes.site(input.url, signal, { owned }).catch((e: unknown) => e) : null,
      input.repo ? this.probes.repo(input.repo, signal).catch((e: unknown) => e) : null,
      input.url && this.probes.lighthouse
        ? this.probes.lighthouse(input.url).catch(() => null)
        : null,
      input.url && this.probes.domain
        ? this.probes.domain(input.url, signal).catch(() => null)
        : null,
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
      checks.push(...siteChecks(s), ...siteExtraChecks(s), ...recetteSiteChecks(s));
      if (domain) checks.push(...domainChecks(domain));
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
      if (r.project) checks.push(...projectChecks(r.project, this.now()));
      if (r.architecture) checks.push(...architectureChecks(r.architecture));
      repoSummary = {
        fullName: r.fullName,
        defaultBranch: r.defaultBranch,
        licence: r.licence,
        ecosystems: r.ecosystems,
        dependencies: r.dependencies,
        vulnerablePackages: r.vulnerable.length,
      };
    }

    if (lighthouse) {
      checks.push(...lighthouseChecks(lighthouse));
    } else if (siteOk && this.probes.lighthouse) {
      checks.push({
        id: 'lh.unavailable',
        category: 'performance',
        status: 'info',
        title: 'Audit Lighthouse indisponible',
        detail:
          'Google PageSpeed Insights n’a pas répondu à temps ou a refusé l’audit (quota, page protégée). Les autres contrôles sont complets ; relancer le pré-vol plus tard pour l’ajouter.',
        fix: null,
        evidence: [],
      });
    }

    let loadTest: PreflightLoadTest | null = null;
    if (input.loadTest && siteOk && proof) {
      const target = (site as SiteFacts).finalUrl;
      // Preuve faite pour l'hôte demandé : jamais de charge sur un autre hôte atteint par redirection.
      const sameHost =
        new URL(target).host.toLowerCase() === new URL(input.url!).host.toLowerCase();
      const loadStarted = Date.now();
      const stages = sameHost ? await this.runLoad(input.userId, target) : null;
      if (stages?.length) {
        loadTest = {
          url: target,
          proof,
          durationMs: Date.now() - loadStarted,
          totalRequests: stages.reduce((n, s) => n + s.requests, 0),
          stages,
          ...concludeLoad(stages),
        };
        checks.push(...loadChecks(loadTest));
      }
    }

    let systalink: PreflightSystalinkAdvice | null = null;
    if (siteOk) {
      const declared = input.systalink ?? null;
      systalink = systalinkAdvice({
        hosted: (site as SiteFacts).hostedOnSystalink,
        declared,
        loadTest,
      });
      const plan = planCheck(systalink);
      if (plan) checks.push(plan);
      const i = checks.findIndex((c) => c.id === 'host.systalink');
      if (i >= 0) checks[i] = declaredButUnseen(checks[i]!, declared);
    }

    const sorted = sortChecks(checks);
    return this.store.save({
      userId: input.userId,
      url: input.url,
      repo: repoOk ? (repo as RepoFacts).fullName : input.repo,
      score: scoreOf(sorted),
      verdict: verdictOf(sorted),
      durationMs: Date.now() - started,
      result: {
        checks: sorted,
        metrics,
        repoSummary,
        lighthouse: lighthouse ?? null,
        loadTest,
        systalink,
        architecture: repoOk ? ((repo as RepoFacts).architecture ?? null) : null,
        counts: countChecks(sorted),
      },
    });
  }
}
