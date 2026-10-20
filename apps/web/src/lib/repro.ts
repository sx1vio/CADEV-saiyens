/**
 * S14 : sites de reproduction acceptés, même règle que `isReproUrl` de @devhub/contracts (copiée
 * ici pour ne pas embarquer zod dans le paquet de l'accueil ; `repro.spec.ts` vérifie l'égalité).
 */
export const REPRO_HOSTS = [
  'stackblitz.com',
  'stackblitz.io',
  'codesandbox.io',
  'csb.app',
  'replit.com',
  'gist.github.com',
  'github.com',
  'codepen.io',
  'jsfiddle.net',
] as const;

/** Lien HTTPS vers un site accepté (ou l'un de ses sous-domaines), sans identifiants ni port. */
export function isReproUrl(value: string): boolean {
  const m = /^https:\/\/([A-Za-z0-9.-]+)(?:[/?#]\S*)?$/.exec(value);
  if (!m) return false;
  const host = m[1]!.toLowerCase();
  if (host.startsWith('.') || host.includes('..')) return false;
  return REPRO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}
