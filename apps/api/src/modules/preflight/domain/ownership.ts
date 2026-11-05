import { createHmac } from 'node:crypto';

// Preuve de propriété d'un domaine, exigée avant un test de charge. Le jeton est dérivé du compte
// et du domaine (rien à stocker) : le même dev obtient toujours le même jeton pour le même site.

export function ownershipToken(secret: string, userId: string, host: string): string {
  return createHmac('sha256', secret)
    .update(`preflight-ownership:${userId}:${host.toLowerCase()}`)
    .digest('base64url')
    .slice(0, 32);
}

export function ownershipInstructions(secret: string, userId: string, url: string) {
  const host = new URL(url).hostname.toLowerCase();
  const token = ownershipToken(secret, userId, host);
  return {
    host,
    token,
    fileUrl: `https://${host}/.well-known/devhub-verify.txt`,
    fileContent: `devhub-verify=${token}`,
    dnsName: `_devhub-verify.${host}`,
    dnsValue: `devhub-verify=${token}`,
  };
}

/** Le fichier ou l'enregistrement contient-il le jeton attendu ? (espaces et casse du préfixe ignorés) */
export function containsToken(text: string, token: string): boolean {
  return text
    .split(/[\r\n,;]+/)
    .map((l) => l.trim().replace(/^"|"$/g, ''))
    .some((l) => l === `devhub-verify=${token}` || l === token);
}
