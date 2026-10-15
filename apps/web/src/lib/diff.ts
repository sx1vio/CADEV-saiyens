/**
 * Différences mot à mot entre deux textes (écran de conflit O4) : `same` est commun,
 * `before` n'existe que dans le premier texte, `after` que dans le second.
 * Les espaces sont gardés comme des mots : recoller les morceaux redonne chaque texte.
 */
export interface DiffPart {
  kind: 'same' | 'before' | 'after';
  text: string;
}

/** Au-delà (mots × mots, hors début et fin communs), on compare ligne à ligne. */
const MAX_CELLS = 1_000_000;

const words = (s: string) => s.split(/(\s+)/).filter(Boolean);
const lines = (s: string) => s.split(/(?<=\n)/).filter(Boolean);

export function diffWords(before: string, after: string): DiffPart[] {
  let a = words(before);
  let b = words(after);
  if (a.length * b.length > MAX_CELLS) {
    a = lines(before);
    b = lines(after);
  }

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const parts: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], text: string) => {
    const last = parts[parts.length - 1];
    if (last?.kind === kind) last.text += text;
    else parts.push({ kind, text });
  };
  a.slice(0, start).forEach((w) => push('same', w));

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  if (midA.length * midB.length > MAX_CELLS) {
    // Textes trop différents pour une comparaison fine : tout le milieu est remplacé.
    midA.forEach((w) => push('before', w));
    midB.forEach((w) => push('after', w));
  } else {
    // Plus longue sous-suite commune, remplie depuis la fin.
    const n = midA.length;
    const m = midB.length;
    const lcs = new Uint32Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        lcs[i * (m + 1) + j] =
          midA[i] === midB[j]
            ? lcs[(i + 1) * (m + 1) + j + 1] + 1
            : Math.max(lcs[(i + 1) * (m + 1) + j], lcs[i * (m + 1) + j + 1]);
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        push('same', midA[i]);
        i++;
        j++;
      } else if (lcs[(i + 1) * (m + 1) + j] >= lcs[i * (m + 1) + j + 1]) push('before', midA[i++]);
      else push('after', midB[j++]);
    }
    while (i < n) push('before', midA[i++]);
    while (j < m) push('after', midB[j++]);
  }

  a.slice(endA).forEach((w) => push('same', w));
  return joinChanges(parts);
}

/**
 * « sur Windows » → « en local » se lit comme un seul remplacement, pas deux : un blanc commun
 * coincé entre deux changements est rattaché aux deux côtés.
 */
function joinChanges(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  let i = 0;
  while (i < parts.length) {
    if (parts[i].kind === 'same') {
      out.push(parts[i++]);
      continue;
    }
    let before = '';
    let after = '';
    while (i < parts.length) {
      const p = parts[i];
      if (p.kind === 'before') before += p.text;
      else if (p.kind === 'after') after += p.text;
      else if (/^\s+$/.test(p.text) && parts[i + 1] && parts[i + 1].kind !== 'same') {
        before += p.text;
        after += p.text;
      } else break;
      i++;
    }
    if (before) out.push({ kind: 'before', text: before });
    if (after) out.push({ kind: 'after', text: after });
  }
  return out;
}
