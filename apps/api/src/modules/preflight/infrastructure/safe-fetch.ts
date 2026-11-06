import { lookup } from 'node:dns/promises';
import { isPrivateAddress } from '../../../infrastructure/http/public-address';

export const PREFLIGHT_USER_AGENT = 'DevHubPreflight/1.0 (+https://devhub.africa/prevol)';

/** Adresse privée, résolution impossible ou protocole refusé. */
export class UnsafeTargetError extends Error {}

export interface FetchedResource {
  url: string;
  status: number;
  headers: Record<string, string>;
  /** Début du corps décodé (au plus maxBytes). */
  body: Buffer;
  /** Octets décodés lus (plafonnés à maxBytes). */
  decodedBytes: number;
  /** Octets sur le réseau : Content-Length, ou estimation si le corps est compressé sans taille. */
  wireBytes: number;
  encoded: boolean;
  ttfbMs: number;
  redirects: string[];
}

/**
 * Client HTTP du pré-vol : refuse le réseau interne (anti-SSRF) à chaque saut de redirection,
 * plafonne la taille lue et la durée de chaque requête, et partage une échéance globale.
 */
export class SafeFetcher {
  private readonly dns = new Map<string, Promise<string[]>>();

  constructor(private readonly deadline: AbortSignal) {}

  /** Adresses publiques d'un hôte ; lève UnsafeTargetError sinon. */
  resolve(hostname: string): Promise<string[]> {
    let p = this.dns.get(hostname);
    if (!p) {
      p = lookup(hostname, { all: true })
        .catch(() => [])
        .then((addrs) => {
          if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
            throw new UnsafeTargetError(hostname);
          }
          return addrs.map((a) => a.address);
        });
      this.dns.set(hostname, p);
    }
    return p;
  }

  async get(
    raw: string,
    opts: {
      maxBytes: number;
      timeoutMs?: number;
      maxRedirects?: number;
      allowHttp?: boolean;
      headers?: Record<string, string>;
      method?: 'GET' | 'POST';
      body?: string;
    },
  ): Promise<FetchedResource> {
    let url = new URL(raw);
    const redirects: string[] = [];
    const started = Date.now();
    const maxRedirects = opts.maxRedirects ?? 4;
    for (let hop = 0; ; hop++) {
      if (url.protocol !== 'https:' && !(opts.allowHttp && url.protocol === 'http:')) {
        throw new UnsafeTargetError(url.protocol);
      }
      if (url.username || url.password) throw new UnsafeTargetError('credentials');
      await this.resolve(url.hostname);
      const res = await fetch(url, {
        method: opts.method ?? 'GET',
        body: opts.body,
        redirect: 'manual',
        signal: AbortSignal.any([this.deadline, AbortSignal.timeout(opts.timeoutMs ?? 8_000)]),
        headers: {
          'User-Agent': PREFLIGHT_USER_AGENT,
          Accept: '*/*',
          'Accept-Encoding': 'br, gzip, deflate',
          ...opts.headers,
        },
      });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location && hop < maxRedirects) {
        await res.body?.cancel().catch(() => undefined);
        redirects.push(url.toString());
        url = new URL(location, url);
        continue;
      }
      const ttfbMs = Date.now() - started;
      const body = await readCapped(res, opts.maxBytes);
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      const encoded = Boolean(
        headers['content-encoding'] && headers['content-encoding'] !== 'identity',
      );
      const length = Number(headers['content-length']);
      const wireBytes =
        Number.isFinite(length) && length > 0
          ? length
          : encoded
            ? Math.round(body.byteLength * 0.3)
            : body.byteLength;
      return {
        url: url.toString(),
        status: res.status,
        headers,
        body,
        decodedBytes: body.byteLength,
        wireBytes,
        encoded,
        ttfbMs,
        redirects,
      };
    }
  }
}

async function readCapped(res: Response, maxBytes: number): Promise<Buffer> {
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks).subarray(0, maxBytes);
}

/** Exécute des tâches avec au plus `limit` en parallèle. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}
