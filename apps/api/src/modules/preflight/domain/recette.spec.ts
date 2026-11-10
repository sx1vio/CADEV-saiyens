import type { PreflightCheck, PreflightReport } from '@devhub/contracts';
import { describe, expect, it } from 'vitest';
import type { RecetteSiteFacts, SiteFacts } from './facts';
import { lighthouseChecks, parsePageSpeed } from './lighthouse';
import { recetteOf, sectionOf, severityOf } from './recette';
import { recetteSiteChecks } from './recette-checks';
import {
  analyseJson,
  apiDefaultNotFound,
  apiTargets,
  manifestDetail,
  robotsDisallow,
  routesInCode,
  sitemapLocs,
  swApiCache,
  zoomBlocked,
} from './recette-page';
import { toMarkdown } from './report';

// Recette (10/11/2026) : contrôles du skill recette-qa intégrés au pré-vol.

const byId = <T extends { id: string }>(checks: T[], id: string) => checks.find((c) => c.id === id);
const c = (
  id: string,
  status: PreflightCheck['status'],
  category: PreflightCheck['category'] = 'security',
): PreflightCheck => ({
  id,
  category,
  status,
  title: id,
  detail: '',
  fix: null,
  evidence: [],
});
const report = (checks: PreflightCheck[], extra: Partial<PreflightReport> = {}) => ({
  url: 'https://a.test/',
  repo: null,
  checks,
  lighthouse: null,
  loadTest: null,
  metrics: null,
  repoSummary: null,
  ...extra,
});

describe('lectures de la page (recette)', () => {
  it('repère le zoom bloqué par la balise viewport (WCAG 1.4.4)', () => {
    expect(
      zoomBlocked('<meta name="viewport" content="width=device-width, user-scalable=no">'),
    ).toBe('user-scalable=no');
    expect(
      zoomBlocked('<meta name="viewport" content="width=device-width, maximum-scale=1">'),
    ).toBe('maximum-scale=1');
    expect(
      zoomBlocked('<meta name="viewport" content="width=device-width, initial-scale=1">'),
    ).toBeNull();
  });

  it('lit les champs du manifeste, sans planter sur un JSON invalide', () => {
    expect(
      manifestDetail(
        JSON.stringify({
          start_url: '/',
          icons: [{ sizes: '192x192' }, { sizes: '512x512', purpose: 'maskable' }],
        }),
      ),
    ).toEqual({
      id: false,
      startUrl: true,
      scope: false,
      themeColor: false,
      icon192: true,
      icon512: true,
      maskable: true,
    });
    expect(manifestDetail('{')).toBeNull();
  });

  it('trouve les routes du routeur et les adresses d’API dans le JavaScript minifié', () => {
    const code = `{path:"emplois",lazy:a},{path:"/u/:handle"},fetch("/api/v1/me",{}),x("/api/v1/questions?limit=10"),y(\`/api/v1/u/\${h}\`)`;
    const r = routesInCode(code);
    expect(r.routes).toEqual(expect.arrayContaining(['/emplois', '/u/:handle']));
    expect(r.api).toEqual(expect.arrayContaining(['/api/v1/me', '/api/v1/questions']));
    expect(r.api.some((p) => p.includes('${'))).toBe(false);
  });

  it('n’appelle jamais une route à effet et essaie les routes réservées d’abord', () => {
    const t = apiTargets([
      '/api/v1/auth/logout',
      '/api/v1/news',
      '/api/v1/admin/users',
      '/api/v1/auth/github',
    ]);
    expect(t).not.toContain('/api/v1/auth/logout');
    expect(t).not.toContain('/api/v1/auth/github');
    expect(t.indexOf('/api/v1/admin/users')).toBeLessThan(t.indexOf('/api/v1/news'));
    expect(t.length).toBeLessThanOrEqual(18);
  });

  it('relève les noms des champs sensibles, jamais les valeurs, et reconnaît une réponse vide', () => {
    expect(analyseJson('{"user":null}')).toMatchObject({
      json: true,
      empty: true,
      personalKeys: [],
    });
    const leak = analyseJson('{"items":[{"handle":"a","email":"a@b.c","passwordHash":"x"}]}');
    expect(leak.personalKeys).toEqual(['email']);
    expect(leak.credentialKeys).toEqual(['passwordHash']);
    expect(JSON.stringify(leak)).not.toContain('a@b.c');
    expect(analyseJson('{"email":null}').personalKeys).toEqual([]);
    expect(analyseJson('<html>').json).toBe(false);
  });

  it('reconnaît les 404 par défaut des frameworks', () => {
    expect(apiDefaultNotFound('{"title":"Cannot GET /api/x"}')).toContain('Express');
    expect(apiDefaultNotFound('{"title":"Not found"}')).toBeNull();
  });

  it('lit sitemap, robots.txt et le cache d’API du service worker', () => {
    const xml =
      '<urlset><url><loc>https://a.test/</loc></url><url><loc>https://a.test/emplois</loc></url><url><loc>https://b.test/x</loc></url></urlset>';
    expect(sitemapLocs(xml, 'https://a.test', 'https://a.test/')).toEqual([
      'https://a.test/emplois',
    ]);
    expect(
      robotsDisallow('User-agent: *\nDisallow: /reglages\nDisallow: /\nDisallow: /publier'),
    ).toEqual(['/reglages', '/publier']);
    expect(swApiCache('registerRoute(({url:e})=>e.pathname.startsWith("/api/v1/news"))')).toEqual([
      '/api/v1/news',
    ]);
  });
});

const recetteFacts = (over: Partial<RecetteSiteFacts> = {}): RecetteSiteFacts => ({
  zoomBlocked: null,
  manifest: {
    id: true,
    startUrl: true,
    scope: true,
    themeColor: true,
    icon192: true,
    icon512: true,
    maskable: true,
  },
  faviconIco: true,
  swApiCache: [],
  pages: [{ url: 'https://a.test/emplois', status: 200 }],
  routes: { sitemap: 1, robotsDisallow: 1, bundle: 3, api: 2 },
  routeSamples: ['/emplois'],
  api: [
    {
      path: '/api/v1/me',
      status: 401,
      json: true,
      personalKeys: [],
      credentialKeys: [],
      empty: true,
      privatePath: true,
      poweredBy: null,
    },
  ],
  apiNotFoundLeak: null,
  apiPoweredBy: null,
  ...over,
});
const site = (
  recette: RecetteSiteFacts,
  headers: Record<string, string> = {},
  lang: string | null = 'fr',
) =>
  ({
    headers,
    html: { bytes: 1, encoded: true, hasViewport: true, lang, title: 'x' },
    extra: { recette },
  }) as unknown as SiteFacts;

describe('contrôles de recette', () => {
  it('un site propre passe tous les nouveaux contrôles', () => {
    const out = recetteSiteChecks(site(recetteFacts(), { 'content-encoding': 'br' }));
    for (const id of [
      'a11y.lang',
      'a11y.zoom',
      'func.pages',
      'sec.anonymous_api',
      'sec.api_disclosure',
      'pwa.manifest',
      'net.brotli',
    ])
      expect(byId(out, id)?.status, id).toBe('pass');
    expect(byId(out, 'func.routes')?.status).toBe('info');
  });

  it('donnée réservée servie sans connexion : échec, et gate éliminatoire', () => {
    const out = recetteSiteChecks(
      site(
        recetteFacts({
          api: [
            {
              path: '/api/v1/me',
              status: 200,
              json: true,
              personalKeys: ['email'],
              credentialKeys: [],
              empty: false,
              privatePath: true,
              poweredBy: 'Express',
            },
          ],
          apiPoweredBy: 'Express',
          apiNotFoundLeak: 'message par défaut d’Express (« Cannot GET … »)',
        }),
      ),
    );
    expect(byId(out, 'sec.anonymous_api')?.status).toBe('fail');
    expect(byId(out, 'sec.anonymous_api')?.evidence.join()).not.toContain('@');
    expect(byId(out, 'sec.api_disclosure')?.status).toBe('warn');
    const r = recetteOf(report(out));
    expect(r.decision).toBe('no_go');
    expect(r.gates.find((g) => g.id === 'gate.anonymous_access')?.status).toBe('fail');
  });

  it('sans preuve de propriété, aucune route d’API n’est appelée et la gate reste non évaluée', () => {
    const out = recetteSiteChecks(site(recetteFacts({ api: [], apiMatrix: 'needs_proof' })));
    expect(byId(out, 'sec.anonymous_api')).toMatchObject({ status: 'info' });
    const r = recetteOf(report(out));
    expect(r.gates.find((g) => g.id === 'gate.anonymous_access')?.status).toBe('untested');
  });

  it('ne garde aucune route à effet, même nommée autrement que logout', () => {
    const t = apiTargets([
      '/api/v1/invite',
      '/api/v1/jobs/publish',
      '/api/v1/cron/run',
      '/api/v1/export',
      '/api/v1/rooms',
    ]);
    expect(
      t.filter(
        (p) =>
          !p.startsWith('/api/v1/rooms') &&
          !/^\/api\/(v1\/)?(me|user|users|admin|account|profile|settings)/.test(p),
      ),
    ).toEqual([]);
    expect(t).toContain('/api/v1/rooms');
  });

  it('une session vide (`{ user: null }`) n’est pas une fuite', () => {
    const out = recetteSiteChecks(
      site(
        recetteFacts({
          api: [
            {
              path: '/api/v1/me/session',
              status: 200,
              json: true,
              personalKeys: [],
              credentialKeys: [],
              empty: true,
              privatePath: true,
              poweredBy: null,
            },
          ],
        }),
      ),
    );
    expect(byId(out, 'sec.anonymous_api')?.status).toBe('pass');
  });

  it('zoom bloqué, langue absente, page en 500, manifeste incomplet, gzip seul', () => {
    const out = recetteSiteChecks(
      site(
        recetteFacts({
          zoomBlocked: 'user-scalable=no',
          pages: [{ url: 'https://a.test/emplois', status: 500 }],
          manifest: {
            id: false,
            startUrl: true,
            scope: true,
            themeColor: true,
            icon192: true,
            icon512: false,
            maskable: false,
          },
          faviconIco: false,
          swApiCache: ['/api/v1/questions'],
        }),
        { 'content-encoding': 'gzip' },
        null,
      ),
    );
    expect(byId(out, 'a11y.zoom')?.status).toBe('fail');
    expect(byId(out, 'a11y.lang')?.status).toBe('warn');
    expect(byId(out, 'func.pages')?.status).toBe('fail');
    expect(byId(out, 'pwa.manifest')?.status).toBe('warn');
    expect(byId(out, 'pwa.manifest')?.evidence).toEqual(
      expect.arrayContaining(['id', 'icône 512 × 512']),
    );
    expect(byId(out, 'pwa.api_cache')?.status).toBe('info');
    expect(byId(out, 'net.brotli')?.status).toBe('info');
  });

  it('rapport ancien sans faits de recette : seule la langue est contrôlée', () => {
    const out = recetteSiteChecks({
      headers: {},
      html: { lang: 'fr', hasViewport: true },
    } as unknown as SiteFacts);
    expect(out.map((x) => x.id)).toEqual(['a11y.lang']);
  });
});

describe('verdict de recette', () => {
  it('classe les contrôles dans les sections du barème, hors barème pour le référencement', () => {
    expect(sectionOf({ id: 'net.pwa', category: 'network' })).toBe('platform');
    expect(sectionOf({ id: 'tls.legacy', category: 'infra' })).toBe('network');
    expect(sectionOf({ id: 'site.cookies', category: 'security' })).toBe('privacy');
    expect(sectionOf({ id: 'seo.title', category: 'seo' })).toBeNull();
    expect(severityOf({ id: 'site.exposed_files', status: 'fail' })).toBe('critical');
    expect(severityOf({ id: 'lh.lcp', status: 'fail' })).toBe('major');
    expect(severityOf({ id: 'lh.lcp', status: 'warn' })).toBe('minor');
    expect(severityOf({ id: 'lh.lcp', status: 'pass' })).toBeNull();
  });

  it('GO quand tout passe, provisoire car l’IDOR n’est jamais évaluable de l’extérieur', () => {
    const r = recetteOf(
      report([
        c('site.exposed_files', 'pass'),
        c('sec.anonymous_api', 'pass'),
        c('tls.legacy', 'pass', 'infra'),
        c('privacy.trackers', 'pass', 'privacy'),
        c('lh.accessibility', 'pass', 'accessibility'),
        c('func.pages', 'pass', 'functional'),
      ]),
    );
    expect(r.decision).toBe('go');
    expect(r.provisional).toBe(true);
    expect(r.score).toBe(100);
    expect(r.gates.find((g) => g.id === 'gate.idor')?.status).toBe('untested');
    expect(r.sections.find((s) => s.key === 'performance')?.score).toBeNull();
  });

  it('une majeure plafonne sa section à 79 et donne GO sous réserves', () => {
    const r = recetteOf(
      report([
        c('func.pages', 'pass', 'functional'),
        c('lh.console_errors', 'pass', 'functional'),
        c('a11y.zoom', 'fail', 'accessibility'),
        ...Array.from({ length: 9 }, (_, i) => c(`a11y.x${i}`, 'pass', 'accessibility')),
        c('site.exposed_files', 'pass'),
      ]),
    );
    const a11y = r.sections.find((s) => s.key === 'accessibility')!;
    expect(a11y.major).toBe(1);
    expect(a11y.score).toBe(79);
    expect(a11y.cap).toBe(79);
    expect(r.decision).toBe('go_with_reservations');
    expect(r.issues[0]).toMatchObject({ checkId: 'a11y.zoom', severity: 'major' });
  });

  it('un traceur publicitaire ou TLS 1.0 accepté font échouer leur gate (NO-GO)', () => {
    const trackers = recetteOf(
      report([c('privacy.trackers', 'warn', 'privacy'), c('func.pages', 'pass', 'functional')]),
    );
    expect(trackers.decision).toBe('no_go');
    const tls = recetteOf(
      report([c('tls.legacy', 'warn', 'infra'), c('func.pages', 'pass', 'functional')]),
    );
    expect(tls.gates.find((g) => g.id === 'gate.tls')?.status).toBe('fail');
    expect(tls.decision).toBe('no_go');
  });

  it('le rapport Markdown donne le verdict, les gates et ce qui reste à tester', () => {
    const checks = [c('site.exposed_files', 'fail'), c('func.pages', 'pass', 'functional')];
    const md = toMarkdown(
      {
        ...report(checks),
        id: '00000000-0000-4000-8000-000000000000',
        createdAt: '2026-11-10T12:00:00.000Z',
        durationMs: 1000,
        score: 50,
        verdict: 'fix',
        counts: { pass: 1, warn: 0, fail: 1, info: 0 },
        systalink: null,
        architecture: null,
        recette: null,
        author: { handle: 'a', displayName: 'A' },
      },
      { page: 'https://x/p', json: 'https://x/j' },
    );
    expect(md).toContain('## Recette (verdict GO / NO-GO)');
    expect(md).toContain('**NO-GO (provisoire)**');
    expect(md).toContain('IDOR');
  });
});

describe('Lighthouse 13 : insights et console', () => {
  it('lit les insights notés par metricSavings et les erreurs de la console', () => {
    const lh = parsePageSpeed({
      lighthouseResult: {
        categories: { performance: { score: 0.81 }, accessibility: { score: 0.97, auditRefs: [] } },
        audits: {
          'lcp-breakdown-insight': { title: 'LCP', score: 0, metricSavings: { LCP: 450 } },
          'cache-insight': { title: 'Cache', score: 1, metricSavings: { LCP: 900 } },
          'unused-javascript': {
            title: 'JS inutilisé',
            details: { type: 'opportunity', overallSavingsMs: 300 },
          },
          'errors-in-console': {
            details: {
              items: [
                {
                  source: 'network',
                  description: 'Failed to load resource: 401',
                  sourceLocation: { url: 'https://a.test/api/v1/me' },
                },
              ],
            },
          },
        },
      },
    })!;
    expect(lh.opportunities.map((o) => o.id)).toEqual([
      'lcp-breakdown-insight',
      'unused-javascript',
    ]);
    expect(lh.consoleErrors).toEqual([
      {
        source: 'network',
        description: 'Failed to load resource: 401',
        url: 'https://a.test/api/v1/me',
      },
    ]);
    const checks = lighthouseChecks(lh);
    expect(byId(checks, 'lh.console_errors')).toMatchObject({
      status: 'warn',
      category: 'functional',
    });
  });

  it('note les mesures terrain avec les seuils officiels (INP ≤ 200 ms)', () => {
    const base = parsePageSpeed({
      lighthouseResult: { categories: { performance: { score: 0.9 } }, audits: {} },
    })!;
    const slow = lighthouseChecks({
      ...base,
      field: { lcpMs: 2000, inpMs: 650, cls: 0.05, overall: 'SLOW' },
    });
    expect(byId(slow, 'lh.field')?.status).toBe('fail');
    const good = lighthouseChecks({
      ...base,
      field: { lcpMs: 2000, inpMs: 120, cls: 0.05, overall: 'FAST' },
    });
    expect(byId(good, 'lh.field')?.status).toBe('pass');
  });
});
