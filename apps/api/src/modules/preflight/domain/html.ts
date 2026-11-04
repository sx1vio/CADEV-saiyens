import type { AssetType } from './facts';

// Lecture volontairement légère du HTML (expressions régulières) : on cherche les ressources
// chargées par la page, pas à reproduire un navigateur.

export interface PageScan {
  assets: { url: string; type: AssetType }[];
  hasViewport: boolean;
  lang: string | null;
  title: string | null;
}

const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : null;
};

export function scanHtml(html: string, base: string, maxImages = 15): PageScan {
  const seen = new Set<string>();
  const assets: PageScan['assets'] = [];
  const add = (href: string | null, type: AssetType) => {
    if (!href || /^(data|blob|javascript|mailto):/i.test(href)) return;
    let url: string;
    try {
      url = new URL(href, base).toString();
    } catch {
      return;
    }
    if (!/^https?:/i.test(url) || seen.has(url)) return;
    seen.add(url);
    assets.push({ url, type });
  };

  for (const m of html.matchAll(/<script\b[^>]*>/gi)) add(attr(m[0], 'src'), 'script');
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(m[0], 'rel') ?? '').toLowerCase().split(/\s+/);
    const href = attr(m[0], 'href');
    if (rel.includes('stylesheet')) add(href, 'style');
    else if (rel.includes('modulepreload')) add(href, 'script');
    else if (rel.includes('preload')) {
      const as = (attr(m[0], 'as') ?? '').toLowerCase();
      add(
        href,
        as === 'script' ? 'script' : as === 'style' ? 'style' : as === 'image' ? 'image' : 'other',
      );
    }
  }
  let images = 0;
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (images >= maxImages) break;
    const before = assets.length;
    add(attr(m[0], 'src'), 'image');
    if (assets.length > before) images++;
  }

  const viewport = [...html.matchAll(/<meta\b[^>]*>/gi)].some(
    (m) => (attr(m[0], 'name') ?? '').toLowerCase() === 'viewport',
  );
  const htmlTag = /<html\b[^>]*>/i.exec(html)?.[0];
  const title = /<title[^>]*>([^<]{0,200})<\/title>/i.exec(html)?.[1]?.trim() || null;
  return {
    assets,
    hasViewport: viewport,
    lang: htmlTag ? attr(htmlTag, 'lang') : null,
    title,
  };
}

/** Le corps ressemble-t-il vraiment au fichier demandé (et non à la page d'accueil d'une SPA) ? */
export function looksExposed(path: string, contentType: string, body: string): boolean {
  if (/text\/html/i.test(contentType) || /<!doctype html|<html[\s>]/i.test(body)) return false;
  if (path.startsWith('/.git/')) return /\[core\]|repositoryformatversion/i.test(body);
  return /^\s*(export\s+)?[A-Z][A-Z0-9_]{1,}\s*=/m.test(body);
}

/** Référence à une carte de source externe en fin de fichier JavaScript. */
export function sourceMapRef(js: string, base: string): string | null {
  const m = /\/\/[#@]\s*sourceMappingURL=([^\s'"]+)\s*$/m.exec(js.slice(-2048));
  if (!m || m[1]!.startsWith('data:')) return null;
  try {
    return new URL(m[1]!, base).toString();
  } catch {
    return null;
  }
}
