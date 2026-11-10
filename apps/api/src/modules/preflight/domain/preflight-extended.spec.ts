import { describe, expect, it } from 'vitest';
import {
  dockerFindings,
  declaredMajor,
  realConnectionStrings,
  secretKinds,
} from '../infrastructure/project.probe';
import { analyzeArchitecture, findCycles, importsOf, resolveImport } from './architecture';
import {
  architectureChecks,
  domainChecks,
  eolOf,
  projectChecks,
  siteExtraChecks,
} from './extended-checks';
import type { DomainFacts, ExtraSiteFacts, ProjectFacts, SiteFacts } from './facts';
import { apexOf, dataCostFcfa, errorLeak, parseCookie, scanPageMeta } from './page';

const byId = <T extends { id: string }>(checks: T[], id: string) => checks.find((c) => c.id === id);

describe('architecture du dépôt', () => {
  it('lit les imports relatifs et les alias, pas les paquets', () => {
    const text = `import React from 'react';\nimport { a } from './a';\nimport type { B } from '@/lib/b';\nexport * from '../c';\nconst d = await import('./d');\nrequire('express');`;
    expect(importsOf('src/x.ts', text).sort()).toEqual(['../c', './a', './d', '@/lib/b']);
  });

  it('résout extensions, index, alias @/ dans un monorepo et imports Python', () => {
    const files = new Set([
      'apps/web/src/lib/b.ts',
      'apps/web/src/a/index.tsx',
      'apps/web/src/x.ts',
      'api/models/user.py',
      'api/views.py',
    ]);
    expect(resolveImport('apps/web/src/x.ts', '@/lib/b', files)).toBe('apps/web/src/lib/b.ts');
    expect(resolveImport('apps/web/src/x.ts', './a', files)).toBe('apps/web/src/a/index.tsx');
    expect(resolveImport('apps/web/src/x.ts', 'react', files)).toBeNull();
    expect(resolveImport('api/views.py', '.models.user', files)).toBe('api/models/user.py');
  });

  it('trouve les cycles et les fichiers carrefour', () => {
    const g = new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['c'])],
      ['c', new Set(['a'])],
      ['d', new Set(['a'])],
    ]);
    expect(findCycles(g)).toEqual([['a', 'b', 'c']]);

    const sources = [
      { path: 'src/util.ts', text: 'export const u = 1;' },
      ...['one', 'two', 'three'].map((n) => ({
        path: `src/${n}.ts`,
        text: `import { u } from './util';\nconsole.log(u);`,
      })),
      { path: 'src/dead.ts', text: 'export const unused = 1; // TODO' },
      { path: 'src/main.ts', text: "import './one';import './two';import './three';" },
    ];
    const a = analyzeArchitecture({
      tree: sources.map((s) => ({ path: s.path, size: s.text.length })),
      sources,
      npmDeps: ['react', 'vite'],
      pyDeps: [],
    });
    expect(a.hubs[0]).toEqual({ file: 'src/util.ts', dependents: 3 });
    expect(a.orphans).toEqual(['src/dead.ts']);
    expect(a.frameworks).toEqual(['React', 'Vite']);
    expect(a.kind).toBe('Application web');
    expect(a.todos).toBe(1);
    expect(a.consoleLogs).toBe(3);
  });
});

describe('lecture de la page', () => {
  it('relève partage, traceurs, contenu mixte, SRI et scripts bloquants', () => {
    const html = `<html><head>
      <meta name="description" content="Une application de test">
      <meta property="og:title" content="Titre"><meta property="og:image" content="/og.png">
      <link rel="icon" href="/f.svg"><link rel="manifest" href="/m.json">
      <script src="https://cdn.example.net/lib.js"></script>
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
      <link rel="stylesheet" href="http://insecure.example.org/a.css">
    </head><body><h1>Salut</h1><img src="/a.png"><img src="/b.webp" alt="" loading="lazy" width="1" height="1"></body></html>`;
    const p = scanPageMeta(html, 'https://app.test/');
    expect(p.description).toBe('Une application de test');
    expect(p.og.title).toBe('Titre');
    expect(p.og.description).toBeUndefined();
    expect(p.manifest).toBe('https://app.test/m.json');
    expect(p.trackers).toContain('Google Analytics / Tag Manager');
    expect(p.mixedContent).toEqual(['http://insecure.example.org/a.css']);
    expect(p.blockingScripts).toEqual(['https://cdn.example.net/lib.js']);
    expect(p.withoutIntegrity).toContain('https://cdn.example.net/lib.js');
    expect(p.imagesWithoutAlt).toBe(1);
    expect(p.h1).toBe(1);
  });

  it('domaine enregistré, cookies, fuites des pages d’erreur, coût en FCFA', () => {
    expect(apexOf('app.devafrica.tech')).toBe('devafrica.tech');
    expect(apexOf('shop.exemple.co.za')).toBe('exemple.co.za');
    expect(parseCookie('sid=abc; Path=/; HttpOnly; Secure; SameSite=Lax')).toEqual({
      name: 'sid',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });
    expect(errorLeak('Traceback (most recent call last):\n  File "x.py"')).toBe(
      'trace d’erreur Python',
    );
    expect(errorLeak('<h1>Not found</h1>')).toBeNull();
    expect(dataCostFcfa(2_000_000)).toBeCloseTo(2);
  });
});

describe('sonde du projet', () => {
  it('ne signale que les vrais secrets', () => {
    expect(realConnectionStrings('postgres://app:Xk9!vQ2pLm@db.prod.example.com:5432/app')).toBe(1);
    expect(realConnectionStrings('postgres://postgres:postgres@localhost:5432/app')).toBe(0);
    expect(
      realConnectionStrings('DATABASE_URL=postgresql://u:${DB_PASSWORD}@db.example.com/x'),
    ).toBe(0);
    expect(secretKinds('const k = "sk-proj-abcdefghijklmnopqrstuvwxyz123456"')).toEqual([
      'openai_key',
    ]);
    expect(secretKinds('const password = "hunter22"')).toEqual([]);
  });

  it('analyse le Dockerfile', () => {
    const f = dockerFindings(
      'FROM node:latest\nENV API_KEY=abc123secret\nCOPY . .\nCMD ["node","x"]',
      false,
    ).map((x) => x.code);
    expect(f).toEqual(['root', 'latest', 'secret_env', 'no_dockerignore', 'no_healthcheck']);
    const ok = dockerFindings(
      'FROM node:24-alpine AS build\nFROM build\nUSER node\nHEALTHCHECK CMD true\nCOPY . .',
      true,
    );
    expect(ok).toEqual([]);
  });

  it('lit les versions déclarées et la fin de support', () => {
    expect(declaredMajor('>=18.0.0')).toBe('18');
    expect(declaredMajor('v20.11.1')).toBe('20');
    expect(declaredMajor('>=3.9')).toBe('3.9');
    const now = new Date('2026-11-10');
    expect(eolOf('node', '20', now)).toBe('2026-04-30');
    expect(eolOf('node', '22', now)).toBeNull();
    expect(eolOf('python', '3.10', now)).toBe('2026-10-31');
  });
});

describe('contrôles du pré-vol v2', () => {
  const domain: DomainFacts = {
    host: 'devafrica.tech',
    apex: 'devafrica.tech',
    tls: {
      protocol: 'TLSv1.3',
      alpn: 'http/1.1',
      validTo: '2026-11-20T00:00:00.000Z',
      daysLeft: 10,
      issuer: 'Let’s Encrypt',
      authorized: true,
      authError: null,
      coversWww: true,
      legacyProtocols: ['TLS 1.1'],
    },
    dns: {
      ipv4: ['1.2.3.4'],
      ipv6: [],
      caa: [],
      mx: [],
      spf: null,
      dmarc: null,
      dkimSelectors: [],
      wwwResolves: true,
    },
  };

  it('domaine : expiration proche, TLS ancien, pas de HTTP/2, e-mails usurpables', () => {
    const c = domainChecks(domain);
    expect(byId(c, 'tls.expiry')?.status).toBe('warn');
    expect(byId(c, 'tls.legacy')?.status).toBe('warn');
    expect(byId(c, 'net.http2')?.status).toBe('warn');
    expect(byId(c, 'mail.spf')?.fix).toContain('v=spf1 -all');
    expect(byId(c, 'mail.dmarc')?.status).toBe('warn');
    expect(byId(c, 'mail.dkim')).toBeUndefined();
  });

  it('site : CORS avec cookies, Firebase ouverte, cookies faibles, coût en data', () => {
    const extra: ExtraSiteFacts = {
      page: scanPageMeta(
        '<html><head><title>x</title></head><body></body></html>',
        'https://a.test/',
      ),
      cookies: [{ name: 'session', secure: false, httpOnly: false, sameSite: null }],
      cors: {
        allowOrigin: 'https://devhub-preflight.invalid',
        allowCredentials: true,
        reflected: true,
      },
      robots: { present: true, disallowAll: true, sitemaps: [] },
      sitemap: false,
      securityTxt: false,
      notFound: { status: 200, leak: null },
      manifest: null,
      serviceWorker: false,
      tokenInLocalStorage: true,
      openFirebase: ['https://demo.firebaseio.com'],
      firebaseChecked: 1,
      graphqlIntrospection: null,
      directoryListing: [],
      apiDocs: [],
      http3: false,
      fonts: { faces: 2, withoutSwap: 2, files: 2 },
      imageFormats: { modern: 0, legacy: 0 },
    };
    const site = {
      finalUrl: 'https://a.test/',
      status: 200,
      headers: {},
      html: { bytes: 1000, encoded: true, hasViewport: true, lang: 'fr', title: 'x' },
      assets: [
        {
          url: 'https://a.test/app.js',
          type: 'script',
          status: 200,
          bytes: 3_000_000,
          encoded: true,
          cacheControl: null,
        },
      ],
      extra,
    } as unknown as SiteFacts;
    const c = siteExtraChecks(site);
    expect(byId(c, 'site.cors')?.status).toBe('fail');
    expect(byId(c, 'site.firebase_open')?.status).toBe('fail');
    expect(byId(c, 'site.cookies')?.status).toBe('fail');
    expect(byId(c, 'site.token_storage')?.status).toBe('warn');
    expect(byId(c, 'seo.robots')?.status).toBe('fail');
    expect(byId(c, 'seo.open_graph')?.status).toBe('warn');
    expect(byId(c, 'net.font_display')?.status).toBe('warn');
    expect(byId(c, 'net.data_cost')?.title).toMatch(/FCFA/);
  });

  it('projet et architecture : secrets, runtime en fin de vie, pas de tests, cycles', () => {
    const p: ProjectFacts = {
      pushedAt: '2026-11-01T00:00:00Z',
      stars: 0,
      openIssues: 0,
      readme: { present: false, bytes: 0, hasSetup: false },
      gitignore: { present: true, ignoresEnv: false, ignoresNodeModules: true },
      envExample: false,
      usesEnvVars: true,
      ci: [],
      testFiles: 0,
      sourceFiles: 40,
      hasTestScript: false,
      linters: [],
      docker: null,
      runtime: { node: '18', python: null },
      tsStrict: false,
      lockfiles: ['package-lock.json', 'yarn.lock'],
      contentSecrets: [{ kind: 'stripe_key', file: 'src/pay.ts' }],
      filesScanned: 40,
      historySecrets: [],
      commitsScanned: 20,
      outdated: [{ name: 'react', current: '16.14.0', latest: '19.2.0', majorsBehind: 3 }],
      deprecated: [{ name: 'request', message: 'request has been deprecated' }],
      installScripts: [],
      abandoned: [],
      registryChecked: 10,
    };
    const c = projectChecks(p, new Date('2026-11-10'));
    expect(byId(c, 'repo.content_secrets')?.status).toBe('fail');
    expect(byId(c, 'repo.history_secrets')?.status).toBe('pass');
    expect(byId(c, 'repo.gitignore')?.status).toBe('warn');
    expect(byId(c, 'runtime.node')?.status).toBe('warn');
    expect(byId(c, 'deps.outdated')?.status).toBe('warn');
    expect(byId(c, 'deps.multiple_lockfiles')?.status).toBe('warn');
    expect(byId(c, 'quality.tests')?.status).toBe('warn');
    expect(byId(c, 'quality.readme')?.status).toBe('warn');

    const arch = architectureChecks({
      kind: 'Application web',
      frameworks: [],
      totalFiles: 10,
      sourceFiles: 10,
      analysedFiles: 10,
      languages: [],
      imports: 12,
      cycles: [['src/a.ts', 'src/b.ts']],
      hubs: [{ file: 'src/util.ts', dependents: 7 }],
      largest: [{ file: 'src/big.tsx', lines: 900 }],
      orphans: [],
      testFiles: 0,
      todos: 0,
      consoleLogs: 0,
      anyTypes: 0,
    });
    expect(byId(arch, 'arch.cycles')?.status).toBe('warn');
    expect(byId(arch, 'arch.hubs')?.evidence[0]).toContain('src/util.ts');
    expect(byId(arch, 'arch.large_files')).toBeDefined();
  });
});
