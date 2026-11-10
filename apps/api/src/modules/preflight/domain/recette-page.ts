import type { RecetteSiteFacts } from './facts';
import { errorLeak } from './page';

// Lectures pures pour les contrôles de recette (10/11/2026) : viewport, manifeste, routes lues
// dans le JavaScript, réponses d'API anonymes. Aucune requête ici : la sonde (site.probe.ts)
// télécharge, ces fonctions interprètent.

/** La balise viewport empêche-t-elle de zoomer (WCAG 1.4.4, RGAA 10.4) ? Renvoie la raison. */
export function zoomBlocked(html: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/name\s*=\s*["']?viewport/i.test(tag)) continue;
    const content = (/content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '').toLowerCase();
    if (/user-scalable\s*=\s*(no|0)\b/.test(content)) return 'user-scalable=no';
    const max = /maximum-scale\s*=\s*([\d.]+)/.exec(content);
    if (max && Number(max[1]) < 2) return `maximum-scale=${max[1]}`;
  }
  return null;
}

/** Champs utiles du manifeste d'installation (PWA). */
export function manifestDetail(raw: string): RecetteSiteFacts['manifest'] {
  try {
    const m = JSON.parse(raw) as {
      id?: unknown;
      start_url?: unknown;
      scope?: unknown;
      theme_color?: unknown;
      icons?: { sizes?: unknown; purpose?: unknown }[];
    };
    const icons = Array.isArray(m.icons) ? m.icons : [];
    const sizes = icons.flatMap((i) => String(i.sizes ?? '').split(/\s+/));
    return {
      id: typeof m.id === 'string' && m.id.length > 0,
      startUrl: typeof m.start_url === 'string' && m.start_url.length > 0,
      scope: typeof m.scope === 'string' && m.scope.length > 0,
      themeColor: typeof m.theme_color === 'string',
      icon192: sizes.includes('192x192'),
      icon512: sizes.includes('512x512'),
      maskable: icons.some((i) => /maskable/.test(String(i.purpose ?? ''))),
    };
  } catch {
    return null;
  }
}

/** Routes déclarées dans un routeur (React Router, Vue Router : `path: "/emplois"`). */
const ROUTE_RE = /\bpath\s*:\s*["'`](\/?[a-z0-9][\w\-/:.*]*)["'`]/gi;
/** Adresses d'API écrites en clair dans le code (`"/api/v1/me"`). */
const API_RE = /["'`](\/api\/[a-z0-9][\w\-/.]*)["'`?]/gi;

/** GET qui pourrait avoir un effet même sans session : jamais appelé par le pré-vol. */
const UNSAFE =
  /log-?out|sign-?out|delete|remove|destroy|reset|unsubscribe|subscribe|confirm|verify|validate|callback|webhook|oauth|auth\/(github|google|gitlab)|activate|deactivate|approve|accept|reject|decline|cancel|invite|publish|unpublish|archive|restore|cron|trigger|run|exec|sync|purge|clear|flush|send|notify|export|import|upload|download|generate|refresh|revoke|rotate|toggle|enable|disable|ban|block|follow|like|vote|buy|pay|checkout|charge|refund|order|book/i;

export function routesInCode(code: string): { routes: string[]; api: string[] } {
  const routes = new Set<string>();
  const api = new Set<string>();
  for (const m of code.matchAll(ROUTE_RE)) {
    const r = m[1]!;
    if (r.length <= 60 && !/\.(js|css|png|svg|json)$/i.test(r))
      routes.add(r.startsWith('/') ? r : `/${r}`);
  }
  for (const m of code.matchAll(API_RE)) {
    const p = m[1]!.replace(/\/+$/, '');
    if (p.length <= 80 && !/[:*]|\$\{/.test(p)) api.add(p);
  }
  return { routes: [...routes], api: [...api] };
}

/** Routes d'API habituellement réservées, essayées même si le code ne les nomme pas. */
export const COMMON_PRIVATE_API = [
  '/api/me',
  '/api/v1/me',
  '/api/user',
  '/api/users',
  '/api/v1/users',
  '/api/admin',
  '/api/admin/users',
  '/api/account',
  '/api/profile',
  '/api/settings',
];

/** Sélection des routes d'API à appeler en anonyme : sans effet, bornée, réservées d'abord. */
export function apiTargets(discovered: string[], limit = 18): string[] {
  const safe = [...new Set([...discovered, ...COMMON_PRIVATE_API])].filter((p) => !UNSAFE.test(p));
  safe.sort((a, b) => Number(isPrivateApiPath(b)) - Number(isPrivateApiPath(a)));
  return safe.slice(0, limit);
}

export function isPrivateApiPath(path: string): boolean {
  return /\/(me|my|admin|account|accounts|profile|settings|billing|private|internal|dashboard|tokens?|session|messages?|inbox|orders|invoices|users)(\/|$)/i.test(
    path,
  );
}

const PERSONAL =
  /^(e-?mail|email_?address|phone|phone_?number|telephone|mobile|address|birth_?date|date_?of_?birth|iban|national_?id)$/i;
const CREDENTIAL =
  /^(password|password_?hash|passwd|hash|token|access_?token|refresh_?token|session_?token|api_?key|secret|client_?secret|private_?key|otp|totp_?secret)$/i;

/**
 * Clés sensibles d'une réponse JSON (noms seulement, jamais les valeurs) et réponse vide.
 * Parcours borné : 2 000 nœuds, profondeur 6.
 */
export function analyseJson(body: string): {
  json: boolean;
  personalKeys: string[];
  credentialKeys: string[];
  empty: boolean;
} {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return { json: false, personalKeys: [], credentialKeys: [], empty: false };
  }
  const personal = new Set<string>();
  const credential = new Set<string>();
  let filled = 0;
  let nodes = 0;
  const walk = (v: unknown, depth: number) => {
    if (nodes++ > 2000 || depth > 6) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        const present = x !== null && x !== '' && x !== false && !(Array.isArray(x) && !x.length);
        if (present && typeof x !== 'object') {
          if (PERSONAL.test(k)) personal.add(k);
          if (CREDENTIAL.test(k)) credential.add(k);
        }
        walk(x, depth + 1);
      }
      return;
    }
    if (v !== null && v !== '' && v !== false) filled++;
  };
  walk(data, 0);
  return {
    json: true,
    personalKeys: [...personal],
    credentialKeys: [...credential],
    empty: filled === 0,
  };
}

/** Réponse par défaut d'un framework sur une route d'API inconnue (cartographie des routes). */
export function apiDefaultNotFound(body: string): string | null {
  if (/Cannot (GET|POST|PUT|DELETE|PATCH) \//.test(body))
    return 'message par défaut d’Express (« Cannot GET … »)';
  if (/Whitelabel Error Page/.test(body)) return 'page d’erreur par défaut de Spring Boot';
  if (/<title>404 Not Found<\/title>[\s\S]*nginx\/\d/.test(body))
    return 'page 404 de Nginx avec sa version';
  return errorLeak(body);
}

/** Adresses du sitemap, même origine que le site, sans la page d'accueil déjà testée. */
export function sitemapLocs(xml: string, origin: string, skip: string, limit = 15): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    try {
      const u = new URL(m[1]!.replace(/&amp;/g, '&'));
      if (u.origin !== origin || u.href === skip || /\.xml$/i.test(u.pathname)) continue;
      if (!out.includes(u.href)) out.push(u.href);
    } catch {
      /* adresse invalide : ignorée */
    }
    if (out.length >= limit) break;
  }
  return out;
}

/** Lignes « Disallow » du robots.txt (souvent les espaces réservés aux membres). */
export function robotsDisallow(robots: string): string[] {
  return [...robots.matchAll(/^\s*disallow\s*:\s*(\/\S*)\s*$/gim)]
    .map((m) => m[1]!)
    .filter((p) => p !== '/');
}

/** Motifs d'API mis en cache par un service worker (Workbox, code écrit à la main). */
export function swApiCache(code: string): string[] {
  const out = new Set<string>();
  for (const m of code.matchAll(/(?:\\\/api\\\/[\w\\/|?:()-]{0,60}|["'`]\/api\/[\w/-]{0,60})/g)) {
    out.add(
      m[0]
        .replace(/^["'`]/, '')
        .replace(/\\\//g, '/')
        .slice(0, 80),
    );
    if (out.size >= 5) break;
  }
  return [...out];
}
