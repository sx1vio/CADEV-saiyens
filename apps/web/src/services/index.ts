import type { DevHubApi } from './api';

/**
 * Point d'entrée unique des données (ADR-0016 §4).
 * - Production : toujours la vraie API, sur la même origine (/api/v1). Le build refuse le mode local.
 * - Développement : serveur simulé dans le navigateur par défaut ; VITE_API_MODE=http (ou
 *   VITE_API_URL) branche l'API locale via le proxy Vite.
 *
 * L'implémentation est chargée à la demande (import dynamique) : elle ne pèse pas sur le premier affichage
 * (budget CDC §9 : accueil sous 300 Ko).
 */
const MODE: DevHubApi['mode'] = import.meta.env.PROD
  ? 'http'
  : import.meta.env.VITE_API_MODE === 'local' ||
      (import.meta.env.DEV &&
        import.meta.env.VITE_API_MODE !== 'http' &&
        !import.meta.env.VITE_API_URL)
    ? 'local'
    : 'http';

let impl: Promise<DevHubApi> | null = null;
export const loadApi = () =>
  (impl ??=
    MODE === 'http'
      ? import('./http').then((m) => m.httpApi)
      : import('./local').then((m) => m.localApi));

export const api = new Proxy({} as DevHubApi, {
  get(_, key: keyof DevHubApi) {
    if (key === 'mode') return MODE;
    return (...args: unknown[]) =>
      loadApi().then((a) => (a[key] as (...x: unknown[]) => unknown)(...args));
  },
});

export * from './types';
export type { QuestionTab, GitHubImport } from './api';
