import type { SiteFacts } from './facts';

/**
 * Profil « 3G rapide » des outils de développement de Chrome : 1,6 Mbit/s descendant,
 * 562,5 ms d'aller-retour. C'est un réseau mobile courant hors des grandes villes.
 */
export const THREE_G = { downBitsPerSecond: 1_600_000, rttMs: 562.5, parallel: 6 } as const;

export interface LoadEstimate {
  totalBytes: number;
  criticalBytes: number;
  requests: number;
  estimated3gMs: number;
}

/**
 * Estimation volontairement simple et explicable du premier affichage en 3G :
 * DNS + TCP + TLS (3 allers-retours), temps serveur, puis les ressources critiques
 * (HTML, CSS, JavaScript) par vagues de 6 requêtes parallèles, au débit du profil.
 * Le JavaScript compte comme critique : une application monopage n'affiche rien sans lui.
 */
export function estimateLoad(site: SiteFacts): LoadEstimate {
  const critical = site.assets.filter((a) => a.type === 'script' || a.type === 'style');
  const criticalBytes = site.html.bytes + critical.reduce((s, a) => s + a.bytes, 0);
  const totalBytes = site.html.bytes + site.assets.reduce((s, a) => s + a.bytes, 0);
  const waves = Math.ceil(critical.length / THREE_G.parallel);
  const transferMs = (criticalBytes * 8 * 1000) / THREE_G.downBitsPerSecond;
  const estimated3gMs = Math.round(
    THREE_G.rttMs * (3 + 1 + waves) + Math.max(0, site.ttfbMs - THREE_G.rttMs) + transferMs,
  );
  return { totalBytes, criticalBytes, requests: 1 + site.assets.length, estimated3gMs };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}

export function formatMs(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}
