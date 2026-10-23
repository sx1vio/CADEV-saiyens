import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resizeToWebp } from '../../../infrastructure/image/raster';
import { isPrivateAddress } from '../../../infrastructure/http/public-address';

// Proxy d'images des actualités : redimensionne, convertit en WebP et met en cache sur disque.
// - Économie de data : une vignette de 640 px pèse ~40 Ko au lieu de ~600 Ko.
// - Vie privée : le navigateur du lecteur ne contacte pas les sites tiers (et la CSP reste 'self').
// - Sécurité : seules les adresses publiques en http(s) sont autorisées (pas de SSRF).

const WIDTHS = [160, 320, 480, 640, 960, 1280] as const;
const MAX_BYTES = 15 * 1024 * 1024;

export class ImageRejectedError extends Error {}

export { isPrivateAddress };

/** Largeur servie : la plus proche parmi quelques tailles fixes (cache efficace). */
export const snapWidth = (w = 640) =>
  WIDTHS.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), 640);

async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw new ImageRejectedError('protocole refusé');
  const addrs = await lookup(url.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address)))
    throw new ImageRejectedError('adresse refusée');
}

export class ImageProxy {
  private ready: Promise<unknown> | null = null;

  constructor(private readonly dir: string) {}

  async get(source: string, width?: number): Promise<Buffer> {
    this.ready ??= mkdir(this.dir, { recursive: true });
    await this.ready;
    const w = snapWidth(width);
    const file = join(
      this.dir,
      `${createHash('sha1').update(`${source}|${w}`).digest('hex')}.webp`,
    );
    const cached = await readFile(file).catch(() => null);
    if (cached) return cached;

    const res = await this.fetchPublic(new URL(source));
    if (!res.ok) throw new ImageRejectedError(`HTTP ${res.status}`);
    if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES)
      throw new ImageRejectedError('image trop lourde');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new ImageRejectedError('image trop lourde');
    const out = await resizeToWebp(buf, w).catch((err: unknown) => {
      throw new ImageRejectedError(err instanceof Error ? err.message : 'image illisible');
    });
    await writeFile(file, out).catch(() => undefined);
    return out;
  }

  /** Suit au plus 3 redirections, en revérifiant l'adresse à chaque saut (une redirection peut viser le réseau interne). */
  private async fetchPublic(url: URL): Promise<Response> {
    for (let hop = 0; hop < 4; hop++) {
      await assertPublic(url);
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevHubBot/0.1)', Accept: 'image/*' },
        redirect: 'manual',
      });
      const location = res.headers.get('location');
      if (res.status < 300 || res.status >= 400 || !location) return res;
      url = new URL(location, url);
    }
    throw new ImageRejectedError('trop de redirections');
  }
}
