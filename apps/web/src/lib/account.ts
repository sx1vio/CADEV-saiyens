/**
 * Compte par e-mail et mot de passe.
 * Mode http : l'API (module identity, POST /api/v1/auth/email/register et /login) ouvre la
 * session en cookie HttpOnly, puis on relit le compte comme après l'OAuth GitHub.
 * Mode local (serveur simulé, ADR-0016) : pas de serveur, le compte vit sur l'appareil.
 */
import { api, type User } from '@/services';

const BASE = `${(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''}/api/v1`;

export class AccountError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

const MESSAGES: Record<number, string> = {
  400: 'Vérifie les champs du formulaire.',
  401: 'E-mail ou mot de passe incorrect.',
  409: 'Un compte existe déjà avec cet e-mail. Connecte-toi.',
  403: 'Ce compte est suspendu par la modération. Écris à l’équipe DevHub pour en savoir plus.',
  429: 'Trop de tentatives. Réessaie dans quelques minutes.',
};

async function post(path: string, body: unknown): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      // L'API exige cet en-tête sur les écritures (protection CSRF, origin.guard.ts)
      headers: { 'Content-Type': 'application/json', 'X-DevHub-Client': 'web' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AccountError(
      'Pas de connexion au serveur. Vérifie ton réseau et réessaie.',
      'network',
    );
  }
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as { code?: string };
  throw new AccountError(MESSAGES[res.status] ?? 'Une erreur est survenue. Réessaie.', data.code);
}

async function serverSession(): Promise<User> {
  const u = await api.getSession();
  if (!u) throw new AccountError('Session introuvable. Réessaie.', 'session');
  return u;
}

/** Identifiant numérique stable : le serveur local indexe les comptes par numéro. */
function stableId(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return -Math.abs(h);
}

function localAccount(name: string, email: string): Promise<User> {
  const address = email.trim().toLowerCase();
  const handle =
    (address.split('@')[0] ?? '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30) || 'dev';
  return api.signUpWithGitHub({
    handle,
    displayName: name.trim() || handle,
    avatarUrl: null,
    bio: '',
    githubId: stableId(`email:${address}`),
    githubCreatedAt: new Date().toISOString(),
    location: null,
    skills: {},
    publicRepos: 0,
  });
}

export async function registerAccount(name: string, email: string, password: string) {
  if (api.mode === 'local') return localAccount(name, email);
  await post('/auth/email/register', { displayName: name.trim(), email: email.trim(), password });
  return serverSession();
}

export async function loginAccount(email: string, password: string) {
  if (api.mode === 'local') return localAccount('', email);
  await post('/auth/email/login', { email: email.trim(), password });
  return serverSession();
}

/** Mot de passe oublié : l'API répond toujours de la même façon, compte existant ou non. */
export async function requestPasswordReset(email: string) {
  await post('/auth/email/forgot', { email: email.trim() });
}

/** Nouveau mot de passe avec le jeton du lien reçu par e-mail ; toutes les sessions sont fermées. */
export async function resetPassword(token: string, password: string) {
  try {
    await post('/auth/email/reset', { token, password });
  } catch (e) {
    if (e instanceof AccountError && e.code === 'auth.reset_invalid')
      throw new AccountError(
        'Ce lien n’est plus valable : il a déjà servi ou il a plus d’une heure. Demande-en un nouveau.',
        e.code,
      );
    throw e;
  }
}
