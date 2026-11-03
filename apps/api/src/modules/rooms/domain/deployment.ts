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

// Partagé avec la liste d'IP de l'espace d'administration (@devhub/core).
import { inCidr } from '@devhub/core';
export { inCidr };

export const onSystalink = (ips: string[], ranges: string[]): boolean =>
  ips.some((ip) => ranges.some((r) => inCidr(ip, r)));

/** Disponibilité depuis la vérification : null tant qu'aucune sonde n'a eu lieu. */
export const uptime = (up: number, total: number): number | null =>
  total > 0 ? Math.round((up / total) * 1000) / 1000 : null;
