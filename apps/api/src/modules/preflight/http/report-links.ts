import type { Env } from '../../../infrastructure/config/env';

/** Adresses publiques d'un rapport : page web, JSON et Markdown (pour l'agent IA). */
export function reportLinks(env: Env, id: string) {
  const app = env.APP_URL.replace(/\/$/, '');
  const api = env.API_URL.replace(/\/$/, '');
  return {
    page: `${app}/prevol/${id}`,
    json: `${api}/api/v1/preflight/${id}`,
    markdown: `${api}/api/v1/preflight/${id}/report.md`,
  };
}
