import type { DevHubApi } from './api';

/**
 * Point d'entrée unique des données. Tant que l'API n'est pas en ligne, le serveur local répond.
 * Pour brancher la vraie API : définir VITE_API_URL (ex. https://api.devhub.africa).
 *
 * L'implémentation est chargée à la demande (import dynamique) : elle ne pèse pas sur le premier affichage
 * (budget CDC §9 : accueil sous 300 Ko).
 */
const MODE: DevHubApi['mode'] = import.meta.env.VITE_API_URL ? 'http' : 'local';

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
