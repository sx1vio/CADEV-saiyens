/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** « local » : serveur simulé (développement seulement) ; « http » : vraie API. */
  readonly VITE_API_MODE?: 'local' | 'http';
}
