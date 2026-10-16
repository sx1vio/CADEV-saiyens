import { isIP } from 'node:net';

/**
 * Anti-SSRF : adresses que le serveur ne doit jamais appeler pour le compte d'un utilisateur
 * (réseau local, boucle locale, métadonnées du nuage). Partagé par le proxy d'images (news)
 * et la vérification des déploiements (rooms).
 */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a = 0, b = 0] = ip.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  return (
    v6 === '::1' ||
    v6 === '::' ||
    v6.startsWith('fc') ||
    v6.startsWith('fd') ||
    v6.startsWith('fe80') ||
    v6.startsWith('::ffff:')
  );
}
