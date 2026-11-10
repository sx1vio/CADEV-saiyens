import { inCidr, maskSecrets } from '@devhub/core';
import type {
  AnonymousApiProbe,
  AssetFact,
  ExtraSiteFacts,
  RecetteSiteFacts,
  SiteFacts,
} from '../domain/facts';
import { looksExposed, scanHtml, sourceMapRef } from '../domain/html';
import { errorLeak, parseCookie, scanPageMeta } from '../domain/page';
import {
  analyseJson,
  apiDefaultNotFound,
  apiTargets,
  isPrivateApiPath,
  manifestDetail,
  robotsDisallow,
  routesInCode,
  sitemapLocs,
  swApiCache,
  zoomBlocked,
} from '../domain/recette-page';
import { pool, type FetchedResource, type SafeFetcher } from './safe-fetch';

const MAX_HTML = 2 * 1024 * 1024;
const MAX_ASSET = 3 * 1024 * 1024;
const MAX_ASSETS = 40;
const MAX_JS_SCANNED = 12;
const SENSITIVE_PATHS = ['/.env', '/.env.local', '/.env.production', '/.git/config'];

/**
 * Fichiers sensibles supplémentaires (pré-vol v2), chacun avec une signature de contenu : une
 * application monopage renvoie sa page d'accueil pour toute adresse, ce n'est pas une fuite.
 */
const EXTRA_SENSITIVE: [string, RegExp][] = [
  ['/.git/HEAD', /^ref: refs\//],
  ['/.DS_Store', /Bud1/],
  ['/.npmrc', /_authToken|\/\/registry\./],
  ['/docker-compose.yml', /^\s*services\s*:/m],
  ['/.aws/credentials', /aws_secret_access_key/i],
  ['/phpinfo.php', /phpinfo\(\)|PHP Version/],
  ['/server-status', /Apache Server Status/],
  ['/backup.sql', /CREATE TABLE|INSERT INTO/i],
  ['/dump.sql', /CREATE TABLE|INSERT INTO/i],
  ['/database.sql', /CREATE TABLE|INSERT INTO/i],
  ['/wp-config.php.bak', /DB_PASSWORD/],
  ['/.vscode/sftp.json', /"password"\s*:/],
];
const LISTING_DIRS = ['/uploads/', '/static/', '/assets/', '/images/', '/files/', '/backup/'];
const API_DOCS = [
  '/swagger',
  '/swagger-ui.html',
  '/api-docs',
  '/docs',
  '/openapi.json',
  '/swagger.json',
  '/api/docs',
];
const GRAPHQL = ['/graphql', '/api/graphql'];

/** Secrets sûrs à signaler dans du code minifié (les motifs génériques donneraient des faux positifs). */
const CLIENT_SECRET_KINDS = new Set([
  'private_key',
  'aws_access_key',
  'github_token',
  'stripe_key',
  'anthropic_key',
  'openai_key',
  'slack_token',
]);

export class SiteUnreachableError extends Error {}

interface JsFindings {
  serviceWorker: boolean;
  tokenInLocalStorage: boolean;
  firebase: Set<string>;
  routes: Set<string>;
  api: Set<string>;
}

const text = (r: FetchedResource) => r.body.toString('utf8');
const isHtml = (r: FetchedResource) =>
  /text\/html/i.test(r.headers['content-type'] ?? '') ||
  /<!doctype html|<html[\s>]/i.test(text(r).slice(0, 2000));

/** Sonde une application en ligne : page, ressources, fichiers sensibles, HTTPS, hébergement. */
export async function probeSite(
  fetcher: SafeFetcher,
  url: string,
  systalinkRanges: string[],
  opts: { owned?: boolean } = {},
): Promise<SiteFacts> {
  const page = await fetcher.get(url, { maxBytes: MAX_HTML, timeoutMs: 12_000 }).catch((e) => {
    throw new SiteUnreachableError(e instanceof Error ? e.message : 'unreachable');
  });
  const final = new URL(page.url);
  const hostIps = await fetcher.resolve(final.hostname);
  const html = page.body.toString('utf8');
  const scan = scanHtml(html, page.url);

  const wanted = scan.assets.slice(0, MAX_ASSETS);
  // Scripts analysés choisis dans l'ordre de la page, pas dans l'ordre où ils finissent d'arriver :
  // sinon les petits fichiers remplissent le quota et le bundle principal, le plus lourd et le
  // plus riche (secrets, routes), n'était jamais lu.
  const toScan = new Set(
    wanted
      .filter((a) => a.type === 'script')
      .slice(0, MAX_JS_SCANNED)
      .map((a) => a.url),
  );
  const clientSecrets: SiteFacts['clientSecrets'] = [];
  const mapUrls: string[] = [];
  const js: JsFindings = {
    serviceWorker: false,
    tokenInLocalStorage: false,
    firebase: new Set<string>(),
    routes: new Set<string>(),
    api: new Set<string>(),
  };
  const fonts = { faces: 0, withoutSwap: 0, files: 0 };

  const fetched = await pool(wanted, 6, async (a): Promise<AssetFact | null> => {
    try {
      const r = await fetcher.get(a.url, { maxBytes: MAX_ASSET, timeoutMs: 8_000 });
      if (a.type === 'script' && r.status < 400 && toScan.has(a.url)) {
        const code = text(r);
        for (const kind of maskSecrets(code).kinds) {
          if (CLIENT_SECRET_KINDS.has(kind)) clientSecrets.push({ kind, file: r.url });
        }
        const map = sourceMapRef(code, r.url);
        if (map) mapUrls.push(map);
        if (/serviceWorker\s*\.\s*register\s*\(|registerSW\(/.test(code)) js.serviceWorker = true;
        if (/localStorage\.setItem\(\s*["'`][\w-]*(token|jwt|auth|session)[\w-]*["'`]/i.test(code))
          js.tokenInLocalStorage = true;
        for (const m of code.matchAll(
          /https:\/\/[a-z0-9-]+(?:-default-rtdb)?\.(?:firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)/gi,
        ))
          js.firebase.add(m[0].toLowerCase());
        // Recette : routes de l'application et adresses d'API écrites dans le code.
        const found = routesInCode(code);
        found.routes.forEach((r) => js.routes.add(r));
        found.api.forEach((a) => js.api.add(a));
      }
      if (a.type === 'style' && r.status < 400) {
        const css = text(r);
        for (const face of css.match(/@font-face\s*{[^}]*}/gi) ?? []) {
          fonts.faces++;
          if (!/font-display\s*:\s*(swap|optional|fallback)/i.test(face)) fonts.withoutSwap++;
          fonts.files += (face.match(/url\(/gi) ?? []).length ? 1 : 0;
        }
      }
      return {
        url: r.url,
        type: a.type,
        status: r.status,
        bytes: r.status < 400 ? r.wireBytes : 0,
        encoded: r.encoded,
        cacheControl: r.headers['cache-control'] ?? null,
        contentType: r.headers['content-type'] ?? null,
      };
    } catch {
      return null;
    }
  });

  const probePath = async (
    path: string,
    maxBytes = 4096,
    extra: Parameters<SafeFetcher['get']>[1] = { maxBytes },
  ) => {
    try {
      return await fetcher.get(new URL(path, final.origin).toString(), {
        timeoutMs: 6_000,
        maxRedirects: 0,
        ...extra,
        maxBytes,
      });
    } catch {
      return null;
    }
  };

  const exposedFiles = (
    await pool(SENSITIVE_PATHS, 4, async (p) => {
      const r = await probePath(p);
      return r && r.status === 200 && looksExposed(p, r.headers['content-type'] ?? '', text(r))
        ? p
        : null;
    })
  ).filter((p): p is string => p !== null);
  const extraExposed = (
    await pool(EXTRA_SENSITIVE, 4, async ([p, sig]) => {
      const r = await probePath(p, 8192);
      return r && r.status === 200 && !isHtml(r) && sig.test(text(r)) ? p : null;
    })
  ).filter((p): p is string => p !== null);

  const sourceMaps = (
    await pool(mapUrls.slice(0, 3), 3, async (m) => {
      try {
        const r = await fetcher.get(m, { maxBytes: 512, timeoutMs: 6_000, maxRedirects: 0 });
        return r.status === 200 && /"(version|mappings)"/.test(text(r)) ? m : null;
      } catch {
        return null;
      }
    })
  ).filter((m): m is string => m !== null);

  let httpRedirectsToHttps: boolean | null;
  try {
    const plain = await fetcher.get(`http://${final.host}/`, {
      maxBytes: 1024,
      timeoutMs: 5_000,
      maxRedirects: 0,
      allowHttp: true,
    });
    const location = plain.headers.location ?? '';
    httpRedirectsToHttps =
      plain.status >= 300 && plain.status < 400 ? location.startsWith('https://') : false;
  } catch {
    httpRedirectsToHttps = null;
  }

  // La preuve porte sur le domaine demandé : après une redirection vers un autre hôte, ce n'est
  // plus le site de l'auteur, la matrice d'API ne tourne pas.
  const sameHost = final.host.toLowerCase() === new URL(url).host.toLowerCase();
  const extra = await probeExtras(fetcher, page, final, html, probePath, js, fonts, fetched, {
    owned: (opts.owned ?? false) && sameHost,
  });

  return {
    requestedUrl: url,
    finalUrl: page.url,
    redirects: page.redirects,
    status: page.status,
    ttfbMs: page.ttfbMs,
    headers: page.headers,
    html: {
      bytes: page.wireBytes,
      encoded: page.encoded,
      hasViewport: scan.hasViewport,
      lang: scan.lang,
      title: scan.title,
    },
    assets: fetched.filter((a): a is AssetFact => a !== null),
    assetsSkipped: Math.max(0, scan.assets.length - wanted.length),
    httpRedirectsToHttps,
    exposedFiles: [...exposedFiles, ...extraExposed],
    clientSecrets,
    sourceMaps,
    hostIps,
    hostedOnSystalink: hostIps.some((ip) => systalinkRanges.some((r) => inCidr(ip, r))),
    extra,
  };
}

/** Pré-vol v2 : tout ce qui se mesure en plus, en parallèle et sans jamais bloquer le rapport. */
async function probeExtras(
  fetcher: SafeFetcher,
  page: FetchedResource,
  final: URL,
  html: string,
  probePath: (
    path: string,
    maxBytes?: number,
    extra?: Parameters<SafeFetcher['get']>[1],
  ) => Promise<FetchedResource | null>,
  js: JsFindings,
  fonts: ExtraSiteFacts['fonts'],
  assets: (AssetFact | null)[],
  scope: { owned: boolean },
): Promise<ExtraSiteFacts> {
  const meta = scanPageMeta(html, page.url);
  const probeId = `devhub-preflight-${Date.now().toString(36)}`;

  const [robotsRes, securityTxt, notFoundRes, corsRes, manifestRes] = await Promise.all([
    probePath('/robots.txt', 64 * 1024),
    probePath('/.well-known/security.txt', 8192),
    probePath(`/${probeId}`, 64 * 1024),
    fetcher
      .get(page.url, {
        maxBytes: 1024,
        timeoutMs: 6_000,
        headers: { Origin: 'https://devhub-preflight.invalid' },
      })
      .catch(() => null),
    meta.manifest
      ? fetcher.get(meta.manifest, { maxBytes: 64 * 1024, timeoutMs: 6_000 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Service worker enregistré dans un fichier chargé plus tard : on essaie les adresses habituelles.
  if (!js.serviceWorker) {
    for (const p of [
      '/sw.js',
      '/service-worker.js',
      '/serviceWorker.js',
      '/firebase-messaging-sw.js',
    ]) {
      const r = await probePath(p, 2048);
      if (
        r &&
        r.status === 200 &&
        !isHtml(r) &&
        /javascript/i.test(r.headers['content-type'] ?? 'javascript')
      ) {
        js.serviceWorker = true;
        break;
      }
    }
  }

  const robotsText =
    robotsRes && robotsRes.status === 200 && !isHtml(robotsRes) ? text(robotsRes) : null;
  const sitemaps = robotsText
    ? [...robotsText.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]!)
    : [];
  const disallowAll = robotsText
    ? /user-agent\s*:\s*\*[\s\S]*?^\s*disallow\s*:\s*\/\s*$/im.test(robotsText)
    : false;
  const sitemapRes = await probePath(
    sitemaps[0] ? new URL(sitemaps[0]).pathname : '/sitemap.xml',
    256 * 1024,
    {
      maxBytes: 256 * 1024,
      maxRedirects: 2,
    },
  );

  let manifest: ExtraSiteFacts['manifest'] = null;
  if (manifestRes && manifestRes.status === 200) {
    try {
      const m = JSON.parse(text(manifestRes)) as {
        name?: string;
        short_name?: string;
        icons?: unknown[];
        display?: string;
      };
      manifest = {
        name: Boolean(m.name || m.short_name),
        icons: Array.isArray(m.icons) ? m.icons.length : 0,
        display: m.display ?? null,
      };
    } catch {
      manifest = { name: false, icons: 0, display: null };
    }
  }

  const allowOrigin = corsRes?.headers['access-control-allow-origin'] ?? null;
  const cors = corsRes
    ? {
        allowOrigin,
        allowCredentials: (corsRes.headers['access-control-allow-credentials'] ?? '') === 'true',
        reflected: allowOrigin === 'https://devhub-preflight.invalid',
      }
    : null;

  // Bases Firebase Realtime trouvées dans le JavaScript : lisibles sans authentification ?
  const firebase = [...js.firebase].slice(0, 3);
  const openFirebase = (
    await pool(firebase, 3, async (base) => {
      try {
        const r = await fetcher.get(`${base}/.json?shallow=true`, {
          maxBytes: 2048,
          timeoutMs: 6_000,
        });
        const body = text(r).trim();
        return r.status === 200 && body !== 'null' && !/permission|denied|error/i.test(body)
          ? base
          : null;
      } catch {
        return null;
      }
    })
  ).filter((b): b is string => b !== null);

  const graphqlIntrospection =
    (
      await pool(GRAPHQL, 2, async (p) => {
        const r = await probePath(p, 4096, {
          maxBytes: 4096,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{__schema{queryType{name}}}' }),
        });
        return r && r.status === 200 && /"__schema"/.test(text(r)) ? p : null;
      })
    ).find((p) => p !== null) ?? null;

  const apiDocs = (
    await pool(API_DOCS, 4, async (p) => {
      const r = await probePath(p, 8192, { maxBytes: 8192, maxRedirects: 1 });
      return r && r.status === 200 && /swagger-ui|"openapi"\s*:|"swagger"\s*:|redoc/i.test(text(r))
        ? p
        : null;
    })
  ).filter((p): p is string => p !== null);

  const directoryListing = (
    await pool(LISTING_DIRS, 3, async (p) => {
      const r = await probePath(p, 8192);
      return r &&
        r.status === 200 &&
        /<title>\s*Index of \/|Directory listing for \//i.test(text(r))
        ? p
        : null;
    })
  ).filter((p): p is string => p !== null);

  const imageFormats = { modern: 0, legacy: 0 };
  for (const a of assets) {
    if (!a || a.type !== 'image' || a.status >= 400) continue;
    const ct = (a.contentType ?? '').toLowerCase();
    if (/webp|avif|svg/.test(ct) || /\.(webp|avif|svg)(\?|$)/i.test(a.url)) imageFormats.modern++;
    else if (/jpe?g|png|gif/.test(ct) || /\.(jpe?g|png|gif)(\?|$)/i.test(a.url))
      imageFormats.legacy++;
  }

  const sitemapOk =
    !!sitemapRes && sitemapRes.status === 200 && /<urlset|<sitemapindex/i.test(text(sitemapRes));
  const recette = await probeRecette(fetcher, final, html, probePath, js, {
    sitemapXml: sitemapOk ? text(sitemapRes!) : null,
    robotsText,
    manifestRaw: manifestRes && manifestRes.status === 200 ? text(manifestRes) : null,
    pageUrl: page.url,
    owned: scope.owned,
  });

  return {
    page: meta,
    cookies: page.setCookies.map(parseCookie).filter((c) => c.name),
    cors,
    robots: { present: robotsText !== null, disallowAll, sitemaps },
    sitemap: sitemapOk,
    securityTxt:
      !!securityTxt && securityTxt.status === 200 && /^\s*contact\s*:/im.test(text(securityTxt)),
    notFound: notFoundRes
      ? { status: notFoundRes.status, leak: errorLeak(text(notFoundRes)) }
      : null,
    manifest,
    serviceWorker: js.serviceWorker,
    tokenInLocalStorage: js.tokenInLocalStorage,
    openFirebase,
    firebaseChecked: firebase.length,
    graphqlIntrospection,
    directoryListing,
    apiDocs,
    http3: /\bh3(-\d+)?=/.test(page.headers['alt-svc'] ?? ''),
    fonts,
    imageFormats,
    recette,
  };
}

/**
 * Recette (10/11/2026, skill recette-qa) : pages du sitemap, routes d'API appelées sans session
 * (GET seulement, jamais d'écriture ni de route à effet), manifeste, service worker, zoom.
 * Une quarantaine de requêtes au plus, en lecture.
 */
async function probeRecette(
  fetcher: SafeFetcher,
  final: URL,
  html: string,
  probePath: (
    path: string,
    maxBytes?: number,
    extra?: Parameters<SafeFetcher['get']>[1],
  ) => Promise<FetchedResource | null>,
  js: JsFindings,
  ctx: {
    sitemapXml: string | null;
    robotsText: string | null;
    manifestRaw: string | null;
    pageUrl: string;
    owned: boolean;
  },
): Promise<RecetteSiteFacts> {
  const locs = ctx.sitemapXml ? sitemapLocs(ctx.sitemapXml, final.origin, ctx.pageUrl) : [];
  // Matrice des routes d'API en anonyme : seulement sur un domaine prouvé (comme le test de charge).
  const targets = ctx.owned ? apiTargets([...js.api]) : [];
  const missing = `/api/devhub-preflight-${Date.now().toString(36)}`;

  const [pages, api, notFound, favicon, sw] = await Promise.all([
    pool(locs, 4, async (u) => {
      try {
        const r = await fetcher.get(u, { maxBytes: 2048, timeoutMs: 8_000, maxRedirects: 3 });
        return { url: u, status: r.status };
      } catch {
        return { url: u, status: 0 };
      }
    }),
    pool(targets, 4, async (path): Promise<AnonymousApiProbe | null> => {
      const r = await probePath(path, 32 * 1024, {
        maxBytes: 32 * 1024,
        headers: { Accept: 'application/json' },
      });
      if (!r) return null;
      const body = text(r);
      const looksJson = /json/i.test(r.headers['content-type'] ?? '') && !isHtml(r);
      const a = looksJson && r.status === 200 ? analyseJson(body) : null;
      return {
        path,
        status: r.status,
        json: looksJson,
        personalKeys: a?.personalKeys ?? [],
        credentialKeys: a?.credentialKeys ?? [],
        empty: a?.empty ?? true,
        privatePath: isPrivateApiPath(path),
        poweredBy: r.headers['x-powered-by'] ?? null,
      };
    }),
    probePath(missing, 8192),
    probePath('/favicon.ico', 1024),
    js.serviceWorker ? probePath('/sw.js', 512 * 1024) : Promise.resolve(null),
  ]);

  const swCode = sw && sw.status === 200 && !isHtml(sw) ? text(sw) : '';
  const probes = api.filter((a): a is AnonymousApiProbe => a !== null);
  return {
    zoomBlocked: zoomBlocked(html),
    manifest: ctx.manifestRaw ? manifestDetail(ctx.manifestRaw) : null,
    faviconIco:
      !!favicon &&
      favicon.status === 200 &&
      !isHtml(favicon) &&
      /image|icon|octet/i.test(favicon.headers['content-type'] ?? 'image'),
    swApiCache: swCode ? swApiCache(swCode) : [],
    pages,
    routes: {
      sitemap: locs.length,
      robotsDisallow: ctx.robotsText ? robotsDisallow(ctx.robotsText).length : 0,
      bundle: js.routes.size,
      api: js.api.size,
    },
    routeSamples: [...js.routes].slice(0, 8),
    api: probes,
    apiMatrix: ctx.owned ? 'done' : 'needs_proof',
    apiPoweredBy:
      notFound?.headers['x-powered-by'] ?? probes.find((a) => a.poweredBy)?.poweredBy ?? null,
    apiNotFoundLeak:
      notFound && notFound.status >= 400 && !isHtml(notFound)
        ? apiDefaultNotFound(text(notFound))
        : null,
  };
}
