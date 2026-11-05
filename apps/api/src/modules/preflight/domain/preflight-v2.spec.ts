import { describe, expect, it } from 'vitest';
import type { PreflightLoadStage } from '@devhub/contracts';
import { runLoadStages } from '../infrastructure/load-runner';
import {
  LoadTestBusyError,
  OwnershipRequiredError,
  RunPreflight,
  type PreflightProbes,
  type PreflightStore,
} from '../application/run-preflight';
import type { SiteFacts } from './facts';
import { lighthouseChecks, parsePageSpeed } from './lighthouse';
import { concludeLoad, loadChecks, percentile, stageHolds, summarizeStage } from './load';
import { containsToken, ownershipInstructions, ownershipToken } from './ownership';

const stage = (over: Partial<PreflightLoadStage>): PreflightLoadStage => ({
  concurrency: 5,
  requests: 100,
  rps: 25,
  p50Ms: 120,
  p95Ms: 300,
  p99Ms: 500,
  errors: 0,
  codes: { '200': 100 },
  ...over,
});

describe('test de charge : règles', () => {
  it('calcule les percentiles sur des durées triées', () => {
    const ms = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(ms, 50)).toBe(50);
    expect(percentile(ms, 95)).toBe(95);
    expect(percentile([], 95)).toBe(0);
  });

  it('résume un palier : débit, erreurs (5xx, 429, délai) et codes', () => {
    const s = summarizeStage(
      2,
      [
        { ms: 100, code: '200' },
        { ms: 200, code: '200' },
        { ms: 10_000, code: 'timeout' },
        { ms: 50, code: '503' },
      ],
      1_000,
    );
    expect(s).toMatchObject({
      requests: 4,
      rps: 4,
      errors: 2,
      codes: { '200': 2, timeout: 1, '503': 1 },
    });
  });

  it('un palier tient sous 2 s au p95 et moins de 2 % d’erreurs', () => {
    expect(stageHolds(stage({}))).toBe(true);
    expect(stageHolds(stage({ p95Ms: 2_400 }))).toBe(false);
    expect(stageHolds(stage({ errors: 3 }))).toBe(false);
    expect(stageHolds(stage({ requests: 0 }))).toBe(false);
  });

  it('trouve le point de rupture et le dernier palier tenu', () => {
    const r = concludeLoad([
      stage({ concurrency: 2 }),
      stage({ concurrency: 5 }),
      stage({ concurrency: 10, p95Ms: 3_100 }),
    ]);
    expect(r).toEqual({ maxStableConcurrency: 5, breakingConcurrency: 10, reachedCeiling: false });
  });

  it('rupture précoce : contrôle bloquant avec pistes de correction', () => {
    const stages = [
      stage({ concurrency: 2 }),
      stage({ concurrency: 5, errors: 30, codes: { '200': 70, '502': 30 } }),
    ];
    const checks = loadChecks({
      url: 'https://app.exemple.sn/',
      proof: 'well-known',
      durationMs: 8_000,
      totalRequests: 200,
      stages,
      ...concludeLoad(stages),
    });
    const capacity = checks.find((c) => c.id === 'load.capacity')!;
    expect(capacity.status).toBe('fail');
    expect(capacity.title).toContain('cède à 5');
    expect(capacity.fix).toContain('cache');
    expect(checks.find((c) => c.id === 'load.server_errors')?.status).toBe('fail');
  });

  it('la montée s’arrête au premier palier qui cède', async () => {
    let t = 0;
    let inFlight = 0;
    const hit = async () => {
      inFlight++;
      await Promise.resolve();
      const slow = inFlight > 4; // le « serveur » ralentit au-delà de 4 requêtes simultanées
      t += slow ? 2_500 : 100;
      await Promise.resolve();
      inFlight--;
      return '200';
    };
    const stages = await runLoadStages(
      hit,
      { stages: [2, 5, 10], stageMs: 1_000, maxRequests: 500 },
      () => t,
    );
    expect(stages.map((s) => s.concurrency)).toEqual([2, 5]);
    expect(stageHolds(stages[0]!)).toBe(true);
  });

  it('respecte le plafond de requêtes', async () => {
    let t = 0;
    const stages = await runLoadStages(
      async () => ((t += 1), '200'),
      { stages: [2, 5], stageMs: 10_000, maxRequests: 50 },
      () => t,
    );
    expect(stages.reduce((n, s) => n + s.requests, 0)).toBeLessThanOrEqual(51);
  });
});

describe('preuve de propriété', () => {
  it('jeton stable par compte et par domaine, différent sinon', () => {
    const a = ownershipToken('s'.repeat(48), 'u1', 'App.Exemple.sn');
    expect(a).toBe(ownershipToken('s'.repeat(48), 'u1', 'app.exemple.sn'));
    expect(a).not.toBe(ownershipToken('s'.repeat(48), 'u2', 'app.exemple.sn'));
    expect(a).toHaveLength(32);
  });

  it('donne le fichier .well-known et l’enregistrement DNS à créer', () => {
    const p = ownershipInstructions('s'.repeat(48), 'u1', 'https://app.exemple.sn/connexion');
    expect(p.fileUrl).toBe('https://app.exemple.sn/.well-known/devhub-verify.txt');
    expect(p.dnsName).toBe('_devhub-verify.app.exemple.sn');
    expect(p.fileContent).toBe(`devhub-verify=${p.token}`);
  });

  it('reconnaît le jeton dans un fichier ou un TXT, pas un autre', () => {
    expect(containsToken('devhub-verify=abc\n', 'abc')).toBe(true);
    expect(containsToken('"devhub-verify=abc"', 'abc')).toBe(true);
    expect(containsToken('devhub-verify=abcd', 'abc')).toBe(false);
  });
});

const psi = {
  lighthouseResult: {
    categories: {
      performance: { score: 0.42 },
      accessibility: {
        score: 0.81,
        auditRefs: [
          { id: 'color-contrast', weight: 7 },
          { id: 'image-alt', weight: 10 },
        ],
      },
      'best-practices': { score: 0.96 },
      seo: { score: 0.92 },
    },
    audits: {
      'first-contentful-paint': { numericValue: 2_100 },
      'largest-contentful-paint': { numericValue: 5_400 },
      'total-blocking-time': { numericValue: 820 },
      'cumulative-layout-shift': { numericValue: 0.04 },
      'speed-index': { numericValue: 4_200 },
      'unused-javascript': {
        title: 'Réduire le JavaScript inutilisé',
        details: { type: 'opportunity', overallSavingsMs: 1_350 },
      },
      'uses-responsive-images': {
        title: 'Adapter la taille des images',
        details: { type: 'opportunity', overallSavingsMs: 600 },
      },
      'color-contrast': {
        score: 0,
        title: 'Contraste insuffisant',
        details: { items: [{}, {}, {}] },
      },
      'image-alt': { score: 1, title: 'Images avec alt' },
    },
  },
  loadingExperience: {
    overall_category: 'AVERAGE',
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3_100 },
      INTERACTION_TO_NEXT_PAINT: { percentile: 240 },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
    },
  },
};

describe('Lighthouse (PageSpeed Insights)', () => {
  it('lit les scores, les mesures, les pistes et les vrais visiteurs', () => {
    const lh = parsePageSpeed(psi)!;
    expect(lh.scores).toEqual({ performance: 42, accessibility: 81, bestPractices: 96, seo: 92 });
    expect(lh.lab.lcpMs).toBe(5_400);
    expect(lh.opportunities[0]).toMatchObject({ id: 'unused-javascript', savingsMs: 1_350 });
    expect(lh.accessibilityIssues).toEqual([
      { id: 'color-contrast', title: 'Contraste insuffisant', items: 3 },
    ]);
    expect(lh.field).toMatchObject({ lcpMs: 3_100, inpMs: 240, cls: 0.05, overall: 'AVERAGE' });
  });

  it('réponse vide : pas d’audit', () => {
    expect(parsePageSpeed({})).toBeNull();
  });

  it('transforme l’audit en contrôles avec les seuils de Google', () => {
    const checks = lighthouseChecks(parsePageSpeed(psi)!);
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
    expect(byId['lh.performance']?.status).toBe('fail');
    expect(byId['lh.performance']?.fix).toContain('Réduire le JavaScript inutilisé');
    expect(byId['lh.lcp']?.status).toBe('fail');
    expect(byId['lh.tbt']?.status).toBe('fail');
    expect(byId['lh.cls']).toBeUndefined();
    expect(byId['lh.accessibility']?.status).toBe('warn');
    expect(byId['lh.seo']).toBeUndefined();
  });
});

describe('pré-vol avec test de charge', () => {
  const site = { finalUrl: 'https://app.exemple.sn/' } as SiteFacts;
  const store = (): PreflightStore & { saved: unknown[] } => {
    const saved: unknown[] = [];
    return { saved, countSince: async () => 0, save: async (x) => (saved.push(x), 'id-1') };
  };

  it('refuse le test de charge sans preuve de propriété', async () => {
    const probes: PreflightProbes = {
      site: async () => site,
      repo: async () => {
        throw new Error('x');
      },
      classify: () => 'other',
      ownership: async () => null,
      loadTest: async () => [],
    };
    await expect(
      new RunPreflight(probes, store()).run({
        userId: 'u1',
        url: 'https://app.exemple.sn',
        repo: null,
        loadTest: true,
      }),
    ).rejects.toBeInstanceOf(OwnershipRequiredError);
  });

  it('un seul test de charge à la fois sur le serveur', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const probes = {
      site: async () =>
        ({
          ...site,
          status: 200,
          headers: {},
          html: { bytes: 1, encoded: true, hasViewport: true, lang: 'fr', title: 'x' },
          assets: [],
          assetsSkipped: 0,
          redirects: [],
          exposedFiles: [],
          clientSecrets: [],
          sourceMaps: [],
          hostIps: [],
          hostedOnSystalink: false,
          httpRedirectsToHttps: true,
          ttfbMs: 10,
          requestedUrl: site.finalUrl,
        }) as SiteFacts,
      repo: async () => {
        throw new Error('x');
      },
      classify: () => 'other' as const,
      ownership: async () => 'well-known' as const,
      loadTest: async () => (await gate, [stage({ concurrency: 2 })]),
    } satisfies PreflightProbes;
    const runner = new RunPreflight(probes, store());
    const first = runner.run({ userId: 'u1', url: site.finalUrl, repo: null, loadTest: true });
    await new Promise((r) => setTimeout(r, 20));
    await expect(
      runner.run({ userId: 'u2', url: site.finalUrl, repo: null, loadTest: true }),
    ).rejects.toBeInstanceOf(LoadTestBusyError);
    release();
    await expect(first).resolves.toBe('id-1');
  });
});
