import { describe, expect, it } from 'vitest';
import type { PreflightCheck, PreflightLoadStage, PreflightLoadTest } from '@devhub/contracts';
import { declaredButUnseen, planCheck, systalinkAdvice } from './hosting';
import { concludeLoad } from './load';
import { toMarkdown } from './report';

const stage = (
  concurrency: number,
  over: Partial<PreflightLoadStage> = {},
): PreflightLoadStage => ({
  concurrency,
  requests: 100,
  rps: 25,
  p50Ms: 120,
  p95Ms: 300,
  p99Ms: 500,
  errors: 0,
  codes: { '200': 100 },
  ...over,
});

function load(stages: PreflightLoadStage[]): PreflightLoadTest {
  return {
    url: 'https://app.exemple.sn/',
    proof: 'well-known',
    durationMs: 20_000,
    totalRequests: stages.reduce((n, s) => n + s.requests, 0),
    stages,
    ...concludeLoad(stages),
  };
}

/** Tient 2, 5 et 10 visiteurs simultanés, cède à 20. */
const breaksAt20 = load([stage(2), stage(5), stage(10), stage(20, { p95Ms: 3_500 })]);
const holdsAll = load([2, 5, 10, 20, 35, 50].map((c) => stage(c)));

describe('conseil d’hébergement Systalink', () => {
  it('serveur cloud saturé : conseille la taille au-dessus, sans promettre de chiffre', () => {
    const a = systalinkAdvice({ hosted: true, declared: 'cloud_starter', loadTest: breaksAt20 });
    expect(a.recommended).toBe('cloud_business');
    expect(a.reason).toContain('cède à 20 visiteurs simultanés');
    expect(a.reason).toContain('relance le pré-vol');
    const check = planCheck(a)!;
    expect(check).toMatchObject({ id: 'host.plan', category: 'hosting', status: 'info' });
    expect(check.title).toContain('Business (2 vCPU, 8 Go');
    expect(check.evidence[0]).toContain('Starter');
  });

  it('plus grande offre listée : répartir la charge, pas d’offre au-dessus', () => {
    const a = systalinkAdvice({ hosted: true, declared: 'cloud_enterprise', loadTest: breaksAt20 });
    expect(a.recommended).toBeNull();
    expect(a.reason).toContain('plusieurs serveurs');
    expect(planCheck(a)).toBeNull();
  });

  it('hébergement mutualisé ou service géré saturé : passer à un serveur dédié', () => {
    for (const declared of ['web_hosting', 'web_service', 'site_builder'] as const) {
      expect(systalinkAdvice({ hosted: true, declared, loadTest: breaksAt20 }).recommended).toBe(
        'cloud_starter',
      );
    }
    const other = systalinkAdvice({ hosted: true, declared: 'cloud_other', loadTest: breaksAt20 });
    expect(other.recommended).toBeNull();
    expect(other.reason).toContain('plus de vCPU');
  });

  it('application lente même sans charge : la machine n’est pas en cause', () => {
    const slow = load([stage(2, { p50Ms: 1_400 }), stage(5, { p95Ms: 4_000 })]);
    const a = systalinkAdvice({ hosted: true, declared: 'cloud_starter', loadTest: slow });
    expect(a.recommended).toBeNull();
    expect(a.reason).toContain('load.slow_baseline');
  });

  it('tient la charge : inutile de changer d’offre', () => {
    const a = systalinkAdvice({ hosted: true, declared: 'cloud_starter', loadTest: holdsAll });
    expect(a.recommended).toBeNull();
    expect(a.reason).toContain('tient 50 visiteurs simultanés');
  });

  it('hors Systalink et saturé : serveur cloud à Dakar ; chez Systalink sans offre : la demander', () => {
    expect(
      systalinkAdvice({ hosted: false, declared: null, loadTest: breaksAt20 }).recommended,
    ).toBe('cloud_business');
    const unknown = systalinkAdvice({ hosted: true, declared: null, loadTest: breaksAt20 });
    expect(unknown.recommended).toBeNull();
    expect(unknown.reason).toContain('Indique ton offre');
  });

  it('sans test de charge : jamais de conseil de taille', () => {
    for (const declared of [null, 'cloud_starter'] as const) {
      for (const hosted of [true, false]) {
        expect(systalinkAdvice({ hosted, declared, loadTest: null }).recommended).toBeNull();
      }
    }
    expect(
      systalinkAdvice({ hosted: true, declared: 'cloud_starter', loadTest: null }).reason,
    ).toContain('Ajoute le test de charge');
  });
});

describe('offre déclarée mais adresse non reconnue', () => {
  const outside: PreflightCheck = {
    id: 'host.systalink',
    category: 'hosting',
    status: 'info',
    title: 'Hébergé hors de Systalink',
    detail: 'x',
    fix: 'https://platform.systalink.com/serverless',
    evidence: ['203.0.113.7'],
  };

  it('site statique derrière un CDN : attendu', () => {
    const c = declaredButUnseen(outside, 'static_site');
    expect(c.title).toBe('Offre Systalink déclarée, adresse non reconnue');
    expect(c.detail).toContain('CDN');
    expect(c.fix).toBeNull();
    expect(c.status).toBe('info');
  });

  it('autre offre : vérifier le domaine ; rien ne change sans déclaration ni si l’IP est reconnue', () => {
    expect(declaredButUnseen(outside, 'cloud_starter').detail).toContain('pointe bien');
    expect(declaredButUnseen(outside, null)).toBe(outside);
    const inside = { ...outside, status: 'pass' as const };
    expect(declaredButUnseen(inside, 'cloud_starter')).toBe(inside);
  });
});

describe('rapport Markdown', () => {
  it('ajoute la section Hébergement Systalink pour l’agent IA', () => {
    const md = toMarkdown(
      {
        id: '00000000-0000-4000-8000-000000000001',
        url: 'https://app.exemple.sn',
        repo: null,
        createdAt: '2026-11-06T10:00:00.000Z',
        durationMs: 1000,
        score: 80,
        verdict: 'review',
        counts: { pass: 1, warn: 1, fail: 0, info: 1 },
        metrics: null,
        repoSummary: null,
        lighthouse: null,
        loadTest: null,
        systalink: systalinkAdvice({
          hosted: true,
          declared: 'cloud_starter',
          loadTest: breaksAt20,
        }),
        checks: [],
        architecture: null,
        author: { handle: 'awa', displayName: 'Awa' },
      },
      { page: 'https://x/prevol/1', json: 'https://x/api/v1/preflight/1' },
    );
    expect(md).toContain('## Hébergement Systalink');
    expect(md).toContain('Offre déclarée : Serveur cloud Starter');
    expect(md).toContain('**Offre conseillée : Serveur cloud Business');
  });
});
