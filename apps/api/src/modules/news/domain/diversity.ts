// Fil varié : au plus N éléments par source, et pas deux titres sur le même sujet.

const STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'its',
  'is',
  'le',
  'la',
  'les',
  'de',
  'des',
  'du',
  'et',
  'un',
  'une',
  'pour',
  'sur',
  'en',
  'au',
  'aux',
]);

export function words(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/** Deux titres parlent-ils du même sujet ? (recouvrement des mots significatifs) */
export function similar(a: Set<string>, b: Set<string>): boolean {
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  return common / Math.max(1, Math.min(a.size, b.size)) >= 0.5;
}

export function diverse<T extends { source: string; title: string }>(
  items: T[],
  n: number,
  perSource = 2,
): T[] {
  const count = new Map<string, number>();
  const out: T[] = [];
  const seen: Set<string>[] = [];
  for (const it of items) {
    const c = count.get(it.source) ?? 0;
    if (c >= perSource) continue;
    const w = words(it.title);
    if (seen.some((s) => similar(s, w))) continue;
    seen.push(w);
    count.set(it.source, c + 1);
    out.push(it);
    if (out.length >= n) break;
  }
  return out;
}
