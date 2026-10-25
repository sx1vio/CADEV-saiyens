/**
 * Compte serveur (e-mail + mot de passe ou OAuth) ↔ profil sur l'appareil.
 * Le serveur garde l'identité et les préférences de l'onboarding ; l'activité (questions,
 * votes, leçons) vit sur l'appareil et fonctionne hors ligne.
 */
import { api, type GitHubImport, type User } from '@/services'

export interface ServerUser {
  id: string
  provider: 'email' | 'github' | 'gitlab' | 'google'
  handle: string
  displayName: string
  email: string | null
  avatarUrl: string | null
  bio: string | null
  location: string | null
  prefs: Record<string, unknown>
  onboardedAt: string | null
}

export class AccountError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

async function post<T>(path: string, body: unknown, method = 'POST'): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new AccountError('Pas de connexion au serveur. Vérifie ton réseau et réessaie.', 'network')
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
  if (!res.ok) throw new AccountError(res.status === 400 ? 'Vérifie les champs du formulaire.' : (data.error ?? 'Une erreur est survenue.'), data.code)
  return data as T
}

export const registerAccount = (name: string, email: string, password: string) => post<{ user: ServerUser }>('/api/auth/register', { name, email, password }).then((r) => r.user)
export const loginAccount = (email: string, password: string) => post<{ user: ServerUser }>('/api/auth/login', { email, password }).then((r) => r.user)
export const saveServerPrefs = (prefs: Record<string, unknown>, onboarded = false) => post<ServerUser>('/api/me/prefs', { prefs, onboarded }, 'PUT').catch(() => null)

export async function fetchServerUser(): Promise<ServerUser | null> {
  const r = await fetch('/api/me', { credentials: 'include' }).catch(() => null)
  return r?.ok ? ((await r.json()) as ServerUser) : null
}

/** Identifiant numérique stable (le serveur local indexe les comptes par numéro). */
export function stableId(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return -Math.abs(h)
}

/** Ouvre (ou retrouve) le profil de l'appareil pour un compte serveur, et y recopie les préférences déjà choisies. */
export async function openLocalProfile(su: ServerUser, gh?: GitHubImport): Promise<User> {
  const data: GitHubImport = gh ?? {
    handle: su.handle,
    displayName: su.displayName,
    avatarUrl: su.avatarUrl,
    bio: su.bio ?? '',
    githubId: stableId(`${su.provider}:${su.id}`),
    githubCreatedAt: new Date().toISOString(),
    location: su.location,
    skills: {},
    publicRepos: 0,
  }
  let user = await api.signUpWithGitHub(data)
  const local = su.prefs?.profile as Parameters<typeof api.updateMe>[0] | undefined
  if (su.onboardedAt && local && !user.codeOfConductAcceptedAt) {
    user = await api.updateMe({ ...local, codeOfConductAcceptedAt: su.onboardedAt })
    const slugs = su.prefs?.skills as string[] | undefined
    if (slugs?.length) await api.setMySkills(slugs)
  }
  return user
}
