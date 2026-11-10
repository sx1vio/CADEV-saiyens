import { describe, expect, it } from 'vitest';
import { isStrongCopyleft, repoChecks, sameSite, siteChecks } from './checks';
import type { RepoFacts, SiteFacts } from './facts';
import { looksExposed, scanHtml, sourceMapRef } from './html';
import {
  isSecretFile,
  parsePackageJson,
  parsePackageLock,
  parsePnpmLock,
  parseRequirements,
  parseYarnLock,
} from './lockfiles';
import { estimateLoad } from './network';
import { scoreOf, sortChecks, toMarkdown, verdictOf } from './report';

const site = (over: Partial<SiteFacts> = {}): SiteFacts => ({
  requestedUrl: 'https://app.exemple.sn',
  finalUrl: 'https://app.exemple.sn/',
  redirects: [],
  status: 200,
  ttfbMs: 300,
  headers: {
    'strict-transport-security': 'max-age=31536000',
    'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  },
  html: { bytes: 2_000, encoded: true, hasViewport: true, lang: 'fr', title: 'App' },
  assets: [
    {
      url: 'https://app.exemple.sn/assets/index-abc.js',
      type: 'script',
      status: 200,
      bytes: 60_000,
      encoded: true,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  ],
  assetsSkipped: 0,
  httpRedirectsToHttps: true,
  exposedFiles: [],
  clientSecrets: [],
  sourceMaps: [],
  hostIps: ['102.203.220.60'],
  hostedOnSystalink: true,
  ...over,
});

const repo = (over: Partial<RepoFacts> = {}): RepoFacts => ({
  fullName: 'awa/boutique',
  defaultBranch: 'main',
  licence: 'MIT',
  archived: false,
  treeTruncated: false,
  committedSecretFiles: [],
  ecosystems: ['npm'],
  manifest: 'package.json',
  lockfile: 'package-lock.json',
  approximateVersions: false,
  dependencies: 120,
  vulnerable: [],
  vulnLookupFailed: false,
  copyleftDependencies: [],
  licenceLookupFailed: false,
  licencesChecked: 12,
  ...over,
});

const byId = (checks: ReturnType<typeof siteChecks>, id: string) => checks.find((c) => c.id === id);

describe('pré-vol : site', () => {
  it('un site léger, sécurisé et chez Systalink est prêt', () => {
    const checks = siteChecks(site());
    expect(checks.filter((c) => c.status === 'fail' || c.status === 'warn')).toEqual([]);
    expect(verdictOf(checks)).toBe('ready');
    expect(scoreOf(checks)).toBe(100);
  });

  it('un .env exposé ou une clé dans le bundle bloque le lancement', () => {
    const checks = siteChecks(
      site({
        exposedFiles: ['/.env'],
        clientSecrets: [{ kind: 'stripe_key', file: 'https://app.exemple.sn/assets/index-abc.js' }],
      }),
    );
    expect(byId(checks, 'site.exposed_files')?.status).toBe('fail');
    expect(byId(checks, 'site.client_secrets')?.status).toBe('fail');
    expect(byId(checks, 'site.client_secrets')?.evidence[0]).toContain('clé secrète Stripe');
    expect(verdictOf(checks)).toBe('fix');
  });

  it('juge le premier affichage en 3G sur le poids critique', () => {
    const heavy = site({
      assets: [
        {
          url: 'https://app.exemple.sn/assets/vendor.js',
          type: 'script',
          status: 200,
          bytes: 2_500_000,
          encoded: true,
          cacheControl: 'max-age=31536000',
        },
      ],
    });
    expect(estimateLoad(heavy).estimated3gMs).toBeGreaterThan(10_000);
    expect(byId(siteChecks(heavy), 'net.first_load_3g')?.status).toBe('fail');
    expect(byId(siteChecks(heavy), 'net.page_weight')?.status).toBe('warn');
  });

  it('ne reproche pas le cache ni la compression des scripts tiers', () => {
    const checks = siteChecks(
      site({
        assets: [
          {
            url: 'https://www.googletagmanager.com/gtag/js',
            type: 'script',
            status: 200,
            bytes: 190_000,
            encoded: false,
            cacheControl: 'private, max-age=900',
          },
        ],
      }),
    );
    expect(byId(checks, 'net.compression')?.status).toBe('pass');
    expect(byId(checks, 'net.caching')).toBeUndefined();
    expect(sameSite('https://cdn.exemple.sn/a.js', 'https://app.exemple.sn/')).toBe(true);
  });

  it('un site sans viewport ni HTTPS imposé échoue ; hors Systalink reste une info', () => {
    const checks = siteChecks(
      site({
        httpRedirectsToHttps: false,
        hostedOnSystalink: false,
        html: { bytes: 2_000, encoded: true, hasViewport: false, lang: null, title: null },
      }),
    );
    expect(byId(checks, 'net.mobile_viewport')?.status).toBe('fail');
    expect(byId(checks, 'site.https_redirect')?.status).toBe('fail');
    expect(byId(checks, 'host.systalink')?.status).toBe('info');
  });
});

describe('pré-vol : dépôt', () => {
  it('signale les failles graves et propose la version corrigée', () => {
    const checks = repoChecks(
      repo({
        vulnerable: [
          {
            ecosystem: 'npm',
            name: 'axios',
            version: '0.21.0',
            ids: ['GHSA-xxxx'],
            severity: 'high',
            summary: 'SSRF',
            fixedIn: '0.21.2',
          },
        ],
      }),
    );
    const vuln = checks.find((c) => c.id === 'deps.vulnerabilities');
    expect(vuln?.status).toBe('fail');
    expect(vuln?.evidence[0]).toContain('corrigé en 0.21.2');
  });

  it('distingue copyleft fort et faible', () => {
    expect(isStrongCopyleft('GPL-3.0')).toBe(true);
    expect(isStrongCopyleft('AGPL-3.0-only')).toBe(true);
    expect(isStrongCopyleft('LGPL-2.1')).toBe(false);
    const checks = repoChecks(
      repo({ copyleftDependencies: [{ name: 'ghostscript-js', licence: 'AGPL-3.0' }] }),
    );
    expect(checks.find((c) => c.id === 'lic.dependencies')?.status).toBe('warn');
    expect(repoChecks(repo({ licence: null })).find((c) => c.id === 'lic.repo')?.status).toBe(
      'warn',
    );
  });

  it('repère les fichiers de secrets, pas les exemples ni les jeux de test', () => {
    expect(isSecretFile('.env')).toBe(true);
    expect(isSecretFile('backend/.env.production')).toBe(true);
    expect(isSecretFile('deploy/id_rsa')).toBe(true);
    expect(isSecretFile('.env.example')).toBe(false);
    expect(isSecretFile('playground/env-nested/.env')).toBe(false);
    expect(isSecretFile('test/fixtures/server.key')).toBe(false);
    expect(isSecretFile('src/keyboard.ts')).toBe(false);
  });
});

describe('pré-vol : fichiers de dépendances', () => {
  it('lit package-lock v3', () => {
    const deps = parsePackageLock(
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'app' },
          'node_modules/react': { version: '19.2.0' },
          'node_modules/a/node_modules/@scope/b': { version: '1.0.0' },
          'node_modules/local': { link: true },
        },
      }),
    );
    expect(deps.map((d) => `${d.name}@${d.version}`)).toEqual(['react@19.2.0', '@scope/b@1.0.0']);
  });

  it('lit pnpm-lock v9, y compris en plusieurs documents', () => {
    const text = [
      '---',
      "lockfileVersion: '9.0'",
      'packages:',
      "  '@pnpm/exe@10.0.0':",
      '    resolution: {integrity: sha512-x}',
      '---',
      "lockfileVersion: '9.0'",
      'importers:',
      '  .: {}',
      'packages:',
      "  '@babel/core@7.26.0':",
      '    resolution: {integrity: sha512-a}',
      '  react@19.2.0:',
      '    resolution: {integrity: sha512-b}',
      'snapshots:',
      "  'react-dom@19.2.0(react@19.2.0)':",
      '    dependencies: {}',
    ].join('\n');
    expect(parsePnpmLock(text).map((d) => `${d.name}@${d.version}`)).toEqual([
      '@pnpm/exe@10.0.0',
      '@babel/core@7.26.0',
      'react@19.2.0',
    ]);
  });

  it('lit yarn.lock, package.json et requirements.txt', () => {
    const yarn =
      '"@babel/core@^7.0.0", "@babel/core@^7.1.0":\n  version "7.26.0"\n\nlodash@^4.17.0:\n  version "4.17.21"\n';
    expect(parseYarnLock(yarn).map((d) => d.name)).toEqual(['@babel/core', 'lodash']);
    const pkg = parsePackageJson(
      JSON.stringify({ dependencies: { express: '^4.18.2', local: 'workspace:*' } }),
    );
    expect(pkg.deps).toEqual([{ ecosystem: 'npm', name: 'express', version: '4.18.2' }]);
    expect(pkg.direct.map((d) => d.name)).toEqual(['express', 'local']);
    expect(parseRequirements('Django==4.2.1\nrequests>=2\nflask[async]==3.0.0 # web')).toEqual([
      { ecosystem: 'PyPI', name: 'django', version: '4.2.1' },
      { ecosystem: 'PyPI', name: 'flask', version: '3.0.0' },
    ]);
  });
});

describe('pré-vol : HTML', () => {
  it('trouve scripts, styles, préchargements et images', () => {
    const scan = scanHtml(
      `<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width">
       <title>Boutique</title><link rel="stylesheet" href="/a.css"><link rel="modulepreload" href="/m.js">
       <script type="module" src="/main.js"></script></head><body><img src="data:image/png;base64,x">
       <img src='https://cdn.exemple.sn/hero.webp'></body></html>`,
      'https://app.exemple.sn/',
    );
    expect(scan.assets).toEqual([
      { url: 'https://app.exemple.sn/main.js', type: 'script' },
      { url: 'https://app.exemple.sn/a.css', type: 'style' },
      { url: 'https://app.exemple.sn/m.js', type: 'script' },
      { url: 'https://cdn.exemple.sn/hero.webp', type: 'image' },
    ]);
    expect(scan).toMatchObject({ hasViewport: true, lang: 'fr', title: 'Boutique' });
  });

  it('ne confond pas la page d’accueil d’une SPA avec un .env exposé', () => {
    expect(looksExposed('/.env', 'text/html', '<!doctype html><html>')).toBe(false);
    expect(looksExposed('/.env', 'text/plain', 'DATABASE_URL=postgres://x')).toBe(true);
    expect(
      looksExposed('/.git/config', 'text/plain', '[core]\n\trepositoryformatversion = 0'),
    ).toBe(true);
    expect(
      sourceMapRef('x();\n//# sourceMappingURL=index.js.map', 'https://a.sn/assets/index.js'),
    ).toBe('https://a.sn/assets/index.js.map');
  });
});

describe('pré-vol : rapport', () => {
  it('met les échecs en tête et rédige une consigne pour l’agent IA', () => {
    const checks = sortChecks([
      ...siteChecks(site({ exposedFiles: ['/.env'] })),
      ...repoChecks(repo()),
    ]);
    expect(checks[0]!.status).toBe('fail');
    const md = toMarkdown(
      {
        id: '00000000-0000-4000-8000-000000000000',
        url: 'https://app.exemple.sn',
        repo: 'awa/boutique',
        createdAt: '2026-11-04T12:00:00.000Z',
        durationMs: 9000,
        score: scoreOf(checks),
        verdict: verdictOf(checks),
        counts: { pass: 1, warn: 0, fail: 1, info: 0 },
        metrics: null,
        repoSummary: null,
        lighthouse: null,
        loadTest: null,
        systalink: null,
        checks,
        architecture: null,
        author: { handle: 'awa', displayName: 'Awa' },
      },
      { page: 'https://devhub.africa/prevol/x', json: 'https://devhub.africa/api/v1/preflight/x' },
    );
    expect(md).toContain('## Consigne pour l’agent IA');
    expect(md).toContain('## À corriger (1)');
    expect(md).toContain('`site.exposed_files`');
    expect(md.indexOf('À corriger')).toBeLessThan(md.indexOf('## OK'));
  });
});
