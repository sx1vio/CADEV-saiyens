/**
 * Connexion via l'API de l'équipe (apps/api, module identity) : OAuth GitHub, session en cookie HttpOnly.
 * GitLab et Google sont prévus (P1) mais pas encore servis par l'API.
 */
export type Provider = 'github' | 'gitlab' | 'google';

/** Réponse de GET /api/v1/me (apps/api/src/modules/identity/http/me.dto.ts). */
export interface MeResponse {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  githubLinked: boolean;
  codeOfConductAcceptedAt: string | null;
  isDemo: boolean;
}

/** Fournisseurs servis par l'API : GitHub dès que l'API répond, les autres pas encore. */
export async function authProviders(): Promise<Record<Provider, boolean>> {
  const res = await fetch('/api/v1/healthz');
  return { github: res.ok, gitlab: false, google: false };
}

/** Démarre l'OAuth GitHub ; au retour, l'API redirige vers `returnTo` (chemin du front). */
export const githubSignInUrl = (returnTo: string) =>
  `/api/v1/auth/github?returnTo=${encodeURIComponent(returnTo)}`;

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch('/api/v1/me', { credentials: 'include' });
  if (!res.ok) throw new Error('session introuvable');
  return (await res.json()) as MeResponse;
}

/** Déconnexion : l'API exige l'en-tête X-DevHub-Client sur les écritures (protection CSRF). */
export const serverLogout = () =>
  fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-DevHub-Client': 'web' },
  }).catch(() => null);
