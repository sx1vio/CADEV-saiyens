/** Nom et description lus dans l'en-tête YAML d'un SKILL.md (clés simples, valeur sur une ou plusieurs lignes). */
export function parseSkillMd(md: string): { name?: string; description?: string } {
  const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md)?.[1];
  if (!head) return {};
  const lines = head.split(/\r?\n/);
  const out: Record<string, string> = {};
  for (let i = 0; i < lines.length; i++) {
    const m = /^(name|description):\s*(.*)$/.exec(lines[i]!);
    if (!m) continue;
    let v = m[2]!.trim();
    if (/^[>|][+-]?$/.test(v)) {
      v = '';
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]!)) v += ` ${lines[++i]!.trim()}`;
    }
    out[m[1]!] = v.replace(/^(["'])([\s\S]*)\1$/, '$2').trim();
  }
  return out;
}
