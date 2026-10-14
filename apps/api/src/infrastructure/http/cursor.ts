// Curseur opaque de pagination (docs/architecture/06-api.md#pagination) : base64url de la clé
// de tri (date, identifiant). Le client ne le construit jamais.

export interface Cursor {
  at: string;
  id: string;
}

export const encodeCursor = (c: Cursor): string =>
  Buffer.from(JSON.stringify(c)).toString('base64url');

/** Curseur invalide ou falsifié : on repart du début plutôt que d'échouer. */
export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Cursor;
    return typeof c.at === 'string' && typeof c.id === 'string' && !Number.isNaN(Date.parse(c.at))
      ? c
      : null;
  } catch {
    return null;
  }
}

/** Condition Prisma « strictement après le curseur » pour un tri (createdAt desc, id desc). */
export function afterCursor(cursor: Cursor | null) {
  if (!cursor) return {};
  const at = new Date(cursor.at);
  return { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: cursor.id } }] };
}
