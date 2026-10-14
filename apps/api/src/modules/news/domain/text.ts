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
