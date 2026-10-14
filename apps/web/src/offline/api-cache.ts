/**
 * O1 : lectures de l'API gardées par le service worker pour être relues sans réseau.
 * Fichier sans dépendance : vite.config.ts l'importe pour configurer Workbox, et l'expression
 * est sérialisée telle quelle dans le service worker.
 *
 * Gardé : contenus que l'on rouvre (questions, salles, Passport, découverte, classement,
 * référentiel des étiquettes, Systalink et impact). Jamais gardé : la session (/me), la
 * connexion (/auth), le flux temps réel (/events), l'administration (/admin), les écritures.
 */
export const API_READ_CACHE = 'api-content';

export const API_READ_PATTERN =
  /^https?:\/\/[^/]+\/api\/v1\/(?:questions|rooms|tasks|u|tags|discover|leaderboard|status|impact|rules)(?:[/?]|$)/;

/** Données personnelles en cache : à vider à la déconnexion (appareil partagé). */
export async function clearApiReadCache(): Promise<void> {
  // Type minimal : ce fichier est aussi lu par vite.config.ts, sans les types du navigateur.
  const storage = (globalThis as { caches?: { delete(name: string): Promise<boolean> } }).caches;
  try {
    await storage?.delete(API_READ_CACHE);
  } catch {
    /* Cache Storage indisponible : rien à vider */
  }
}
