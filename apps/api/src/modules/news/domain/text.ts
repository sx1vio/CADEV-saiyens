// Nettoyage du texte des flux : entités HTML, balises, mentions « The post … appeared first on ».

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
};

export function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

export function cleanText(html: string | undefined, max = 280): string {
  if (!html) return '';
  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .replace(
      /(The post|Cet article|L’article|L'article) .{0,200}(appeared first on|est apparu en premier sur).*$/i,
      '',
    )
    .trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}

/** Première image d'un fragment HTML (repli quand le flux n'en déclare pas). */
export function firstImage(html: string | undefined): string | null {
  const m = html?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] && /^https?:\/\//.test(m[1]) ? decode(m[1]) : null;
}

/**
 * Description complète d'une offre d'emploi, en texte brut structuré : paragraphes séparés par
 * une ligne vide, puces « • », titres sur leur propre ligne. Jamais de HTML stocké ni affiché
 * (aucun risque d'injection) ; coupée à `max` caractères.
 */
export function htmlToText(html: string | undefined | null, max = 12_000): string {
  if (!html) return '';
  // Certaines API (Greenhouse) renvoient le HTML lui-même échappé : on le décode d'abord.
  const raw = /&lt;\/?[a-z]/i.test(html) && !/<[a-z]/i.test(html) ? decode(html) : html;
  const text = decode(
    raw
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/(p|div|h[1-6]|ul|ol|section|article|blockquote|tr)>/gi, '\n\n')
      .replace(/<(h[1-6])[^>]*>/gi, '\n\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\r/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}
