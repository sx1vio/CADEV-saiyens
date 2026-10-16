import type { SystalinkSource, SystalinkTarget } from '@devhub/contracts';

// Idée B (partenariat Systalink) : chaque bouton « Déployer sur Systalink » passe par DevHub,
// qui compte le renvoi, puis redirige vers une adresse de cette liste fermée (pas de
// redirection ouverte). Les paramètres utm_* permettent à Systalink d'attribuer l'inscription.

const TARGETS: Record<SystalinkTarget, string> = {
  /** Serverless : déployer une application web sans gérer de serveur. */
  deploy: 'https://platform.systalink.com/serverless',
  /** Orion : site généré par l'IA, offre gratuite, paiement mobile money. */
  orion: 'https://systalink.com/fr/orion',
  /** Serveur cloud à Dakar, pour les projets qui grandissent. */
  server: 'https://systalink.com/fr/server-cloud',
};

export function systalinkUrl(
  target: SystalinkTarget,
  source: SystalinkSource,
  repoUrl?: string | null,
): string {
  const url = new URL(TARGETS[target]);
  url.searchParams.set('utm_source', 'devhub-africa');
  url.searchParams.set('utm_medium', source);
  url.searchParams.set('utm_campaign', 'cadev-2026');
  if (repoUrl) url.searchParams.set('repo', repoUrl);
  return url.toString();
}
