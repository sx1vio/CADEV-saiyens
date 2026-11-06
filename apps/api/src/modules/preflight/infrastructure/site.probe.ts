import { inCidr, maskSecrets } from '@devhub/core';
import type { AssetFact, SiteFacts } from '../domain/facts';
import { looksExposed, scanHtml, sourceMapRef } from '../domain/html';
import { pool, type SafeFetcher } from './safe-fetch';

const MAX_HTML = 2 * 1024 * 1024;
const MAX_ASSET = 3 * 1024 * 1024;
const MAX_ASSETS = 40;
const MAX_JS_SCANNED = 12;
const SENSITIVE_PATHS = ['/.env', '/.env.local', '/.env.production', '/.git/config'];

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

/** Sonde une application en ligne : page, ressources, fichiers sensibles, HTTPS, hébergement. */
export async function probeSite(
  fetcher: SafeFetcher,
  url: string,
  systalinkRanges: string[],
): Promise<SiteFacts> {
  const page = await fetcher.get(url, { maxBytes: MAX_HTML, timeoutMs: 12_000 }).catch((e) => {
    throw new SiteUnreachableError(e instanceof Error ? e.message : 'unreachable');
  });
  const final = new URL(page.url);
  const hostIps = await fetcher.resolve(final.hostname);
  const html = page.body.toString('utf8');
  const scan = scanHtml(html, page.url);

  const wanted = scan.assets.slice(0, MAX_ASSETS);
  let jsScanned = 0;
  const clientSecrets: SiteFacts['clientSecrets'] = [];
  const mapUrls: string[] = [];

  const fetched = await pool(wanted, 6, async (a): Promise<AssetFact | null> => {
    try {
      const r = await fetcher.get(a.url, { maxBytes: MAX_ASSET, timeoutMs: 8_000 });
      if (a.type === 'script' && r.status < 400 && jsScanned < MAX_JS_SCANNED) {
        jsScanned++;
        const js = r.body.toString('utf8');
        for (const kind of maskSecrets(js).kinds) {
          if (CLIENT_SECRET_KINDS.has(kind)) clientSecrets.push({ kind, file: r.url });
        }
        const map = sourceMapRef(js, r.url);
        if (map) mapUrls.push(map);
      }
      return {
        url: r.url,
        type: a.type,
        status: r.status,
        bytes: r.status < 400 ? r.wireBytes : 0,
        encoded: r.encoded,
        cacheControl: r.headers['cache-control'] ?? null,
      };
    } catch {
      return null;
    }
  });

  const exposedFiles = (
    await pool(SENSITIVE_PATHS, 4, async (p) => {
      try {
        const r = await fetcher.get(new URL(p, final.origin).toString(), {
          maxBytes: 4096,
          timeoutMs: 6_000,
          maxRedirects: 0,
        });
        return r.status === 200 &&
          looksExposed(p, r.headers['content-type'] ?? '', r.body.toString('utf8'))
          ? p
          : null;
      } catch {
        return null;
      }
    })
  ).filter((p): p is string => p !== null);

  const sourceMaps = (
    await pool(mapUrls.slice(0, 3), 3, async (m) => {
      try {
        const r = await fetcher.get(m, { maxBytes: 512, timeoutMs: 6_000, maxRedirects: 0 });
        return r.status === 200 && /"(version|mappings)"/.test(r.body.toString('utf8')) ? m : null;
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
    exposedFiles,
    clientSecrets,
    sourceMaps,
    hostIps,
    hostedOnSystalink: hostIps.some((ip) => systalinkRanges.some((r) => inCidr(ip, r))),
  };
}
