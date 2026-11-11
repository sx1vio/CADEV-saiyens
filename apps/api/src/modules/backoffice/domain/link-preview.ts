import { cleanText, decode } from '../../news';

// Aperçu d'un lien pour l'administration (11/11/2026) : titre, résumé, image, site et date lus
// dans les balises Open Graph, Twitter et HTML de la page. Fonction pure, testée sur du HTML.

export interface LinkPreview {
  title: string;
  summary: string;
  image: string | null;
  sourceName: string;
  lang: 'fr' | 'en';
  publishedAt: string | null;
}

/** Contenu d'une balise <meta> par property ou name, quel que soit l'ordre des attributs. */
function meta(html: string, names: string[]): string | null {
  for (const n of names) {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const a = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${esc}["'][^>]*content=(?:"([^"]*)"|'([^']*)')`,
      'i',
    ).exec(html);
    const b = new RegExp(
      `<meta[^>]+content=(?:"([^"]*)"|'([^']*)')[^>]*(?:property|name|itemprop)=["']${esc}["']`,
      'i',
    ).exec(html);
    const m = a ?? b;
    const v = (m?.[1] ?? m?.[2])?.trim();
    if (v) return decode(v);
  }
  return null;
}

function absolute(src: string | null, base: string): string | null {
  if (!src) return null;
  try {
    const u = new URL(src, base);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseLinkPreview(html: string, url: string): LinkPreview {
  const head = html.slice(0, 300_000);
  const host = new URL(url).hostname.replace(/^www\./, '');
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  const title =
    meta(head, ['og:title', 'twitter:title']) ?? (titleTag ? cleanText(titleTag, 400) : host);
  const summary = cleanText(
    meta(head, ['og:description', 'twitter:description', 'description']) ?? '',
    600,
  );
  const image = absolute(meta(head, ['og:image', 'og:image:url', 'twitter:image']), url);
  const sourceName = meta(head, ['og:site_name', 'application-name']) ?? host;
  const htmlLang = /<html[^>]+lang=["']([a-zA-Z-]+)["']/i.exec(head)?.[1]?.toLowerCase();
  const ogLocale = meta(head, ['og:locale'])?.toLowerCase();
  const lang = (htmlLang ?? ogLocale ?? '').startsWith('fr') ? 'fr' : 'en';
  const published = meta(head, ['article:published_time', 'og:published_time', 'datePublished']);
  const date = published ? new Date(published) : null;
  return {
    title: cleanText(title, 400) || host,
    summary,
    image,
    sourceName: cleanText(sourceName, 80) || host,
    lang,
    publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
  };
}
