import type { PreflightCheck, PreflightFix, PreflightReport } from '@devhub/contracts';

// Correctifs prêts à appliquer (11/11/2026) : pour les points du pré-vol qu'un fichier règle,
// le rapport donne le fichier complet et, avec un dépôt GitHub, un lien qui ouvre l'éditeur de
// GitHub prérempli (« Propose changes » crée la branche et la pull request). DevHub n'a besoin
// d'aucun droit d'écriture sur le dépôt : c'est le dev qui valide, sur GitHub, avec son compte.
// Fonction pure, recalculée à chaque lecture : les anciens rapports en profitent aussi.

type Input = Pick<PreflightReport, 'url' | 'repo' | 'checks' | 'repoSummary'>;

/** Au-delà, l'adresse préremplie devient trop longue pour les navigateurs et GitHub. */
const MAX_URL = 7_500;

const open = (c: Pick<PreflightCheck, 'status'>) => c.status === 'fail' || c.status === 'warn';

const PUBLIC_NOTE =
  'Dossier public/ (Vite, Next.js, React, Astro, Nuxt) ; static/ pour SvelteKit, la racine du site pour un site statique.';

export function githubNewFileUrl(
  repo: string | null,
  branch: string | null,
  path: string,
  content: string,
): string | null {
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  const url =
    `https://github.com/${repo}/new/${encodeURIComponent(branch ?? 'main')}` +
    `?filename=${encodeURIComponent(path)}&value=${encodeURIComponent(content)}`;
  return url.length <= MAX_URL ? url : null;
}

const SECURITY_HEADERS: [string, string][] = [
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
  ['X-Frame-Options', 'DENY'],
  [
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; font-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  ],
];

const CSP_NOTE =
  'Adapte la Content-Security-Policy à tes domaines externes (API, CDN, analytics) ; essaie-la d’abord sous le nom Content-Security-Policy-Report-Only et regarde la console.';

/** Correctifs prêts pour les points ouverts du rapport, dans l'ordre des contrôles. */
export function fixesOf(report: Input, opts: { apiOrigin: string; now?: Date }): PreflightFix[] {
  const now = opts.now ?? new Date();
  const repo = report.repoSummary?.fullName ?? report.repo ?? null;
  const branch = report.repoSummary?.defaultBranch ?? null;
  const origin = report.url ? safeOrigin(report.url) : null;
  const host = origin ? new URL(origin).host : null;
  const openIds = new Set(report.checks.filter(open).map((c) => c.id));
  const fixes: PreflightFix[] = [];

  const file = (
    checkId: string,
    title: string,
    path: string,
    language: string,
    content: string,
    note: string | null,
  ) =>
    fixes.push({
      checkId,
      title,
      kind: 'file',
      path,
      language,
      content,
      githubUrl: githubNewFileUrl(repo, branch, path, content),
      note,
    });
  const snippet = (
    checkId: string,
    title: string,
    path: string | null,
    language: string,
    content: string,
    note: string | null,
  ) =>
    fixes.push({ checkId, title, kind: 'snippet', path, language, content, githubUrl: null, note });
  const command = (checkId: string, title: string, content: string, note: string | null) =>
    fixes.push({
      checkId,
      title,
      kind: 'command',
      path: null,
      language: 'bash',
      content,
      githubUrl: null,
      note,
    });

  // En-têtes de sécurité : un seul jeu complet, quel que soit le contrôle qui l'a relevé.
  const headerCheck = [
    'site.security_headers',
    'site.hsts_quality',
    'site.permissions_policy',
    'site.csp_quality',
  ].find((id) => openIds.has(id));
  if (headerCheck && origin) {
    file(
      headerCheck,
      'En-têtes de sécurité (Netlify, Cloudflare Pages)',
      'public/_headers',
      'text',
      `/*\n${SECURITY_HEADERS.map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`,
      `${CSP_NOTE} ${PUBLIC_NOTE}`,
    );
    snippet(
      headerCheck,
      'En-têtes de sécurité (Vercel)',
      'vercel.json',
      'json',
      JSON.stringify(
        {
          headers: [
            { source: '/(.*)', headers: SECURITY_HEADERS.map(([key, value]) => ({ key, value })) },
          ],
        },
        null,
        2,
      ),
      `À fusionner dans vercel.json s’il existe déjà. ${CSP_NOTE}`,
    );
    snippet(
      headerCheck,
      'En-têtes de sécurité (Nginx)',
      'nginx : bloc server { … }',
      'nginx',
      SECURITY_HEADERS.map(([k, v]) => `add_header ${k} "${v}" always;`).join('\n') +
        '\nserver_tokens off;',
      `Puis nginx -t && systemctl reload nginx. ${CSP_NOTE}`,
    );
    snippet(
      headerCheck,
      'En-têtes de sécurité (Caddy)',
      'Caddyfile',
      'caddy',
      `header {\n${SECURITY_HEADERS.map(([k, v]) => `  ${k} "${v}"`).join('\n')}\n  -Server\n}`,
      `Dans le bloc du site. ${CSP_NOTE}`,
    );
  }

  if (openIds.has('site.security_txt') && origin) {
    const expires = new Date(now.getTime() + 365 * 24 * 3600 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');
    file(
      'site.security_txt',
      'Contact de sécurité (security.txt, RFC 9116)',
      'public/.well-known/security.txt',
      'text',
      `Contact: mailto:security@${host!.replace(/^www\./, '')}\nExpires: ${expires}\nPreferred-Languages: fr, en\nCanonical: ${origin}/.well-known/security.txt\n`,
      `Remplace l’adresse par une boîte que tu lis vraiment. ${PUBLIC_NOTE}`,
    );
  }

  if (openIds.has('seo.robots') && origin) {
    file(
      'seo.robots',
      'robots.txt',
      'public/robots.txt',
      'text',
      `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
      PUBLIC_NOTE,
    );
  }

  if (openIds.has('seo.sitemap') && origin) {
    file(
      'seo.sitemap',
      'sitemap.xml',
      'public/sitemap.xml',
      'xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc><lastmod>${now.toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`,
      `Ajoute une ligne <url> par page publique. ${PUBLIC_NOTE}`,
    );
  }

  if (openIds.has('repo.gitignore')) {
    file(
      'repo.gitignore',
      '.gitignore : ne jamais publier les secrets ni les dépendances',
      '.gitignore',
      'text',
      'node_modules/\ndist/\nbuild/\n.next/\ncoverage/\n\n# Secrets\n.env\n.env.*\n!.env.example\n\n*.log\n.DS_Store\n',
      'Si un .env a déjà été publié, change aussi les secrets qu’il contenait : l’historique Git les garde.',
    );
  }

  if (openIds.has('quality.ci')) {
    const workflow = `# Lint, types, tests et build à chaque push, puis le pré-vol DevHub.
name: Pré-vol
on: [push, pull_request]
permissions:
  contents: read
  pull-requests: write
jobs:
  prevol:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: sx1vio/CADEV-saiyens/actions/prevol@main
        with:
          token: \${{ secrets.DEVHUB_TOKEN }}
${origin ? `          url: ${origin}\n` : ''}          api-url: ${opts.apiOrigin}
          fail-on: fix
`;
    file(
      'quality.ci',
      'Intégration continue avec le pré-vol',
      '.github/workflows/prevol.yml',
      'yaml',
      workflow,
      'Crée un jeton « Pré-vol seulement » sur DevHub et mets-le dans le secret DEVHUB_TOKEN du dépôt (Settings → Secrets and variables → Actions).',
    );
  }

  if (openIds.has('net.mobile_viewport')) {
    snippet(
      'net.mobile_viewport',
      'Affichage mobile',
      'index.html, dans <head>',
      'html',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      'Sans maximum-scale ni user-scalable=no : bloquer le zoom gêne les malvoyants.',
    );
  }

  if (openIds.has('a11y.lang')) {
    snippet(
      'a11y.lang',
      'Langue de la page',
      'index.html',
      'html',
      '<html lang="fr">',
      'Les lecteurs d’écran prononcent la page dans la bonne langue.',
    );
  }

  const seoMissing = ['seo.title', 'seo.description', 'seo.open_graph'].filter((id) =>
    openIds.has(id),
  );
  if (seoMissing.length && origin) {
    snippet(
      seoMissing[0]!,
      'Titre, description et aperçu de partage',
      'index.html, dans <head>',
      'html',
      [
        '<title>Nom de l’app : ce qu’elle fait en quelques mots</title>',
        '<meta name="description" content="Une phrase de 120 à 160 caractères qui donne envie de cliquer." />',
        '<meta property="og:title" content="Nom de l’app" />',
        '<meta property="og:description" content="Une phrase qui donne envie de cliquer." />',
        `<meta property="og:url" content="${origin}/" />`,
        `<meta property="og:image" content="${origin}/og.png" />`,
        '<meta name="twitter:card" content="summary_large_image" />',
      ].join('\n'),
      'og.png : image de 1200 × 630 px dans le dossier public. C’est elle qui s’affiche sur WhatsApp, LinkedIn et X.',
    );
  }

  if (openIds.has('site.source_maps')) {
    snippet(
      'site.source_maps',
      'Ne plus publier les cartes de source',
      'vite.config.ts',
      'ts',
      'export default defineConfig({\n  build: { sourcemap: false },\n});',
      'Next.js : productionBrowserSourceMaps: false dans next.config.js. Supprime aussi les fichiers .map déjà en ligne.',
    );
  }

  if (openIds.has('site.tech_disclosure')) {
    snippet(
      'site.tech_disclosure',
      'Masquer la pile technique',
      'serveur Express',
      'ts',
      "app.disable('x-powered-by');",
      'Nginx : server_tokens off; Caddy : header -Server.',
    );
  }

  if (openIds.has('deps.lockfile')) {
    command(
      'deps.lockfile',
      'Fichier de verrouillage des dépendances',
      'npm install\ngit add package-lock.json\ngit commit -m "chore: lock dependencies"',
      'Avec pnpm ou yarn : pnpm install / yarn, puis committe pnpm-lock.yaml ou yarn.lock.',
    );
  }

  return fixes;
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
