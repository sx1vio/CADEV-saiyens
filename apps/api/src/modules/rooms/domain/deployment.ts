// Preuve « en production » d'une salle (idée A, partenariat Systalink). Règles pures.
//
// 1. Le créateur indique l'URL publique de l'application ; la salle reçoit un jeton.
// 2. L'application sert ce jeton (fichier /.well-known/devhub-proof.txt ou balise
//    <meta name="devhub-proof">) : la mise en ligne est vérifiée, par n'importe qui.
// 3. Si l'adresse IP de l'application est dans les plages réseau de Systalink, la salle
//    affiche « En production sur Systalink » et le créateur gagne +10 Proof XP, une fois.
// 4. Le worker sonde l'application : la disponibilité devient une preuve publique.

export class DeploymentNotFoundError extends Error {}
/** L'URL répond, mais ne sert pas le jeton de la salle. */
export class ProofNotFoundError extends Error {}
/** L'URL ne répond pas, ou vise une adresse interdite (réseau local). */
export class DeploymentUnreachableError extends Error {}

/** Jeton à publier : 24 caractères hexadécimaux, préfixés pour être reconnus dans une page. */
export function deploymentToken(randomBytes: (n: number) => Uint8Array): string {
  return `devhub-${[...randomBytes(12)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/** Le jeton est servi tel quel (fichier) ou dans une balise meta de la page d'accueil. */
export function servesToken(body: string, token: string): boolean {
  if (body.split(/\s+/).includes(token)) return true;
  const meta = /<meta\s+[^>]*name=["']devhub-proof["'][^>]*>/gi;
  return [...body.matchAll(meta)].some(
    (m) => m[0].includes(`"${token}"`) || m[0].includes(`'${token}'`),
  );
}

/** Même application si l'origine (schéma, hôte, port) ne change pas : le jeton reste valable. */
export const sameOrigin = (a: string, b: string): boolean =>
  new URL(a).origin === new URL(b).origin;

const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return null;
  }
  return parts.reduce((n, p) => n * 256 + p, 0);
};

/** IPv4 dans une plage CIDR (« 102.203.220.0/22 »). Les plages IPv6 ne sont pas gérées. */
export function inCidr(ip: string, cidr: string): boolean {
  const [base = '', bits = '32'] = cidr.trim().split('/');
  const n = ipv4ToInt(ip.replace(/^::ffff:/i, ''));
  const b = ipv4ToInt(base);
  const len = Number(bits);
  if (n === null || b === null || !Number.isInteger(len) || len < 0 || len > 32) return false;
  const size = 2 ** (32 - len);
  return Math.floor(n / size) === Math.floor(b / size);
}

export const onSystalink = (ips: string[], ranges: string[]): boolean =>
  ips.some((ip) => ranges.some((r) => inCidr(ip, r)));

/** Disponibilité depuis la vérification : null tant qu'aucune sonde n'a eu lieu. */
export const uptime = (up: number, total: number): number | null =>
  total > 0 ? Math.round((up / total) * 1000) / 1000 : null;
