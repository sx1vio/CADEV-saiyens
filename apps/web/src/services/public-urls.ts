/**
 * Images publiques servies par l'API hors du préfixe /api/v1 (Caddy route /og/* et /badge/* vers
 * l'API, ADR-0012). Même origine en production ; VITE_API_URL en développement si besoin.
 */
const ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** PR5 : Proof Card 1200 × 630 d'un Passport ; `download` propose un nom de fichier. */
export function proofCardUrl(handle: string, lang: 'fr' | 'en', download = false): string {
  const query = new URLSearchParams({ lang });
  if (download) query.set('download', '1');
  return `${ORIGIN}/og/u/${encodeURIComponent(handle)}.png?${query}`;
}
