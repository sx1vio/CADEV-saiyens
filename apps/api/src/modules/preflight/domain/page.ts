import type { PageFacts } from './facts';

// Lecture du HTML de la page pour le référencement, les aperçus de partage, la vie privée et la
// robustesse. Expressions régulières volontairement simples (même approche que html.ts).

const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : null;
};

/** Traceurs publicitaires et analytiques connus (hôte → nom). */
const TRACKERS: [RegExp, string][] = [
  [/(^|\.)google-analytics\.com$|(^|\.)googletagmanager\.com$/, 'Google Analytics / Tag Manager'],
  [/(^|\.)connect\.facebook\.net$/, 'Meta Pixel'],
  [/(^|\.)hotjar\.com$/, 'Hotjar'],
  [/(^|\.)clarity\.ms$/, 'Microsoft Clarity'],
  [/(^|\.)doubleclick\.net$|(^|\.)googlesyndication\.com$/, 'Google Ads'],
  [/(^|\.)analytics\.tiktok\.com$/, 'TikTok Pixel'],
  [/(^|\.)snap\.licdn\.com$/, 'LinkedIn Insight'],
  [/(^|\.)segment\.(com|io)$/, 'Segment'],
  [/(^|\.)mxpnl\.com$|(^|\.)mixpanel\.com$/, 'Mixpanel'],
  [/(^|\.)hs-scripts\.com$|(^|\.)hubspot\.com$/, 'HubSpot'],
  [/(^|\.)yandex\.ru$/, 'Yandex Metrica'],
  [/(^|\.)intercom\.io$|(^|\.)intercomcdn\.com$/, 'Intercom'],
  [/(^|\.)fullstory\.com$/, 'FullStory'],
];

export function trackerName(host: string): string | null {
  return TRACKERS.find(([re]) => re.test(host))?.[1] ?? null;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

const root = (h: string) => h.split('.').slice(-2).join('.');

export function scanPageMeta(html: string, base: string): PageFacts {
  const pageHost = hostOf(base);
  const httpsPage = base.startsWith('https://');
  const head = /<head[\s>][\s\S]*?<\/head>/i.exec(html)?.[0] ?? html.slice(0, 20_000);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key: string, by: 'name' | 'property') =>
    metas
      .find((m) => (attr(m, by) ?? '').toLowerCase() === key)
      ?.match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i)
      ?.slice(1)
      .find(Boolean)
      ?.trim() ?? null;
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const rel = (l: string) => (attr(l, 'rel') ?? '').toLowerCase().split(/\s+/);

  const og: Record<string, string> = {};
  for (const m of metas) {
    const p = (attr(m, 'property') ?? attr(m, 'name') ?? '').toLowerCase();
    if (p.startsWith('og:')) {
      const c = /content\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m);
      if (c) og[p.slice(3)] = (c[1] ?? c[2] ?? '').trim();
    }
  }

  const abs = (href: string | null) => {
    if (!href) return null;
    try {
      return new URL(href, base).toString();
    } catch {
      return null;
    }
  };

  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]);
  const headScripts = [...head.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]);
  const blockingScripts = headScripts
    .filter(
      (s) =>
        attr(s, 'src') && !/\s(async|defer)\b/i.test(s) && (attr(s, 'type') ?? '') !== 'module',
    )
    .map((s) => abs(attr(s, 'src')))
    .filter((u): u is string => !!u)
    .slice(0, 10);
  const inlineScripts = scripts.filter(
    (s) => !attr(s, 'src') && !/type\s*=\s*["']?(application\/(ld\+)?json|importmap)/i.test(s),
  ).length;

  const thirdParty = new Set<string>();
  const withoutIntegrity: string[] = [];
  const mixed: string[] = [];
  const trackers = new Set<string>();
  const external = [
    ...scripts.map((s) => ({ tag: s, url: abs(attr(s, 'src')) })),
    ...links
      .filter((l) => rel(l).includes('stylesheet'))
      .map((l) => ({ tag: l, url: abs(attr(l, 'href')) })),
  ];
  for (const { tag, url } of external) {
    if (!url) continue;
    const h = hostOf(url);
    if (httpsPage && url.startsWith('http://')) mixed.push(url);
    if (h && root(h) !== root(pageHost)) {
      if (/^<script/i.test(tag)) thirdParty.add(h);
      if (!/\sintegrity\s*=/i.test(tag)) withoutIntegrity.push(url);
    }
    const t = trackerName(h);
    if (t) trackers.add(t);
  }
  // Traceurs aussi chargés par un extrait inline (gtag, fbq).
  if (/googletagmanager\.com\/gtag|google-analytics\.com\/analytics/i.test(html))
    trackers.add('Google Analytics / Tag Manager');
  if (/connect\.facebook\.net\/[^"']*fbevents/i.test(html)) trackers.add('Meta Pixel');

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  for (const i of imgs) {
    const src = abs(attr(i, 'src'));
    if (httpsPage && src?.startsWith('http://')) mixed.push(src);
  }
  const iframes = (html.match(/<iframe\b/gi) ?? []).length;

  // Champ mot de passe dans un formulaire envoyé en clair.
  let insecureForms = 0;
  for (const f of html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)) {
    const action = abs(attr(/<form\b[^>]*>/i.exec(f[0])![0], 'action') ?? base);
    if (/type\s*=\s*["']?password/i.test(f[0]) && action?.startsWith('http://')) insecureForms++;
  }

  return {
    description: meta('description', 'name'),
    canonical: abs(
      links.find((l) => rel(l).includes('canonical'))
        ? attr(
            links.find((l) => rel(l).includes('canonical'))!,
            'href',
          )
        : null,
    ),
    robotsMeta: meta('robots', 'name'),
    og,
    twitterCard: meta('twitter:card', 'name'),
    favicon: links.some((l) => rel(l).includes('icon')),
    appleTouchIcon: links.some((l) => rel(l).includes('apple-touch-icon')),
    manifest: abs(
      links.find((l) => rel(l).includes('manifest'))
        ? attr(
            links.find((l) => rel(l).includes('manifest'))!,
            'href',
          )
        : null,
    ),
    themeColor: !!meta('theme-color', 'name'),
    generator: meta('generator', 'name'),
    h1: (html.match(/<h1[\s>]/gi) ?? []).length,
    images: imgs.length,
    imagesWithoutAlt: imgs.filter((i) => attr(i, 'alt') === null).length,
    imagesLazy: imgs.filter((i) => (attr(i, 'loading') ?? '').toLowerCase() === 'lazy').length,
    imagesWithoutSize: imgs.filter((i) => !attr(i, 'width') || !attr(i, 'height')).length,
    blockingScripts,
    inlineScripts,
    thirdPartyHosts: [...thirdParty].slice(0, 15),
    withoutIntegrity: withoutIntegrity.slice(0, 10),
    mixedContent: [...new Set(mixed)].slice(0, 10),
    trackers: [...trackers],
    iframes,
    insecureForms,
  };
}

/** Coût d'une visite en données mobiles, en FCFA (hypothèse affichée : 1 Go ≈ 1 000 FCFA). */
export const FCFA_PER_GB = 1000;
export const dataCostFcfa = (bytes: number) => (bytes / 1_000_000_000) * FCFA_PER_GB;

/** Domaine enregistré (exemple.com, exemple.co.za) à partir d'un nom d'hôte. */
export function apexOf(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, '').split('.');
  if (labels.length <= 2) return labels.join('.');
  const second = labels[labels.length - 2]!;
  const last = labels[labels.length - 1]!;
  if (
    last.length === 2 &&
    ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'or', 'ne', 'go'].includes(second)
  )
    return labels.slice(-3).join('.');
  return labels.slice(-2).join('.');
}

/** Cookie Set-Cookie → nom et attributs de sécurité (jamais la valeur). */
export function parseCookie(header: string) {
  const [pair, ...attrs] = header.split(';');
  const name = (pair ?? '').split('=')[0]!.trim();
  const a = attrs.map((x) => x.trim().toLowerCase());
  const same = a.find((x) => x.startsWith('samesite='));
  return {
    name,
    secure: a.includes('secure'),
    httpOnly: a.includes('httponly'),
    sameSite: same ? same.slice(9) : null,
  };
}

/** Indices de fuite dans une page d'erreur : trace de pile, version de serveur, requête SQL. */
export function errorLeak(body: string): string | null {
  const probes: [RegExp, string][] = [
    [/Traceback \(most recent call last\)/, 'trace d’erreur Python'],
    [/\n\s+at [\w$.<>]+ \([^)]*:\d+:\d+\)/, 'trace d’erreur JavaScript'],
    [/SQLSTATE\[|You have an error in your SQL syntax|PG::|ORA-\d{5}/, 'erreur SQL'],
    [/Whoops!|Illuminate\\|Symfony\\Component/, 'page d’erreur Laravel/Symfony en mode debug'],
    [
      /DisallowedHost|Django Version:|You're seeing this error because you have <code>DEBUG = True/,
      'page d’erreur Django en mode DEBUG',
    ],
    [/<b>(Fatal error|Warning|Notice)<\/b>:.* in <b>\//, 'erreur PHP avec chemin du serveur'],
    [/Exception in thread|java\.lang\.\w+Exception/, 'exception Java'],
  ];
  return probes.find(([re]) => re.test(body))?.[1] ?? null;
}
