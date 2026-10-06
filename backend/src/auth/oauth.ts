/**
 * Connexion OAuth réelle : GitHub, GitLab, Google.
 * - `state` aléatoire stocké en base et à usage unique (protection CSRF), valable 10 minutes ;
 * - échange du code côté serveur (le secret ne quitte jamais le serveur) ;
 * - session par cookie HttpOnly + SameSite=Lax (+ Secure en production), 30 jours.
 */
import { randomBytes } from 'node:crypto'
import { config, type Provider } from '../config.js'
import { getDb } from '../db.js'

interface Profile {
  providerId: string
  handle: string
  displayName: string
  email: string | null
  avatarUrl: string | null
  bio: string | null
  location: string | null
  profileUrl: string | null
}

const callbackUrl = (p: Provider) => `${config.apiUrl}/api/auth/${p}/callback`

export function configuredProviders(): Record<Provider, boolean> {
  return {
    github: !!(config.oauth.github.clientId && config.oauth.github.clientSecret),
    gitlab: !!(config.oauth.gitlab.clientId && config.oauth.gitlab.clientSecret),
    google: !!(config.oauth.google.clientId && config.oauth.google.clientSecret),
  }
}

export async function authorizeUrl(p: Provider, nextPath: string) {
  const state = randomBytes(24).toString('base64url')
  const db = await getDb()
  await db.query(`DELETE FROM oauth_states WHERE created_at < now() - interval '10 minutes'`)
  await db.query('INSERT INTO oauth_states (state, provider, next_path) VALUES ($1, $2, $3)', [state, p, safeNext(nextPath)])
  const redirect = encodeURIComponent(callbackUrl(p))
  if (p === 'github') return `https://github.com/login/oauth/authorize?client_id=${config.oauth.github.clientId}&redirect_uri=${redirect}&scope=read:user%20user:email&state=${state}&allow_signup=true`
  if (p === 'gitlab') return `${config.oauth.gitlab.baseUrl}/oauth/authorize?client_id=${config.oauth.gitlab.clientId}&redirect_uri=${redirect}&response_type=code&scope=read_user&state=${state}`
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.oauth.google.clientId}&redirect_uri=${redirect}&response_type=code&scope=openid%20email%20profile&state=${state}&prompt=select_account`
}

/** N'accepte qu'un chemin interne, pour éviter les redirections ouvertes. */
function safeNext(p: string) {
  return /^\/(?!\/)[\w\-./?=&%]*$/.test(p) ? p : '/'
}

async function consumeState(p: Provider, state: string) {
  const db = await getDb()
  const rows = await db.query<{ next_path: string }>(`DELETE FROM oauth_states WHERE state = $1 AND provider = $2 AND created_at > now() - interval '10 minutes' RETURNING next_path`, [state, p])
  if (!rows.length) throw new Error('state invalide ou expiré')
  return rows[0].next_path
}

async function postForm<T>(url: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) })
  if (!res.ok) throw new Error(`jeton refusé (${res.status})`)
  return (await res.json()) as T
}

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'DevHub' } })
  if (!res.ok) throw new Error(`profil refusé (${res.status})`)
  return (await res.json()) as T
}

async function fetchProfile(p: Provider, code: string): Promise<Profile> {
  if (p === 'github') {
    const tok = await postForm<{ access_token?: string; error?: string }>('https://github.com/login/oauth/access_token', { client_id: config.oauth.github.clientId, client_secret: config.oauth.github.clientSecret, code, redirect_uri: callbackUrl(p) })
    if (!tok.access_token) throw new Error(tok.error ?? 'pas de jeton')
    const u = await getJson<{ id: number; login: string; name: string | null; email: string | null; avatar_url: string; bio: string | null; location: string | null; html_url: string }>('https://api.github.com/user', tok.access_token)
    let email = u.email
    if (!email) {
      const emails = await getJson<{ email: string; primary: boolean; verified: boolean }[]>('https://api.github.com/user/emails', tok.access_token).catch(() => [])
      email = emails.find((e) => e.primary && e.verified)?.email ?? null
    }
    return { providerId: String(u.id), handle: u.login, displayName: u.name || u.login, email, avatarUrl: u.avatar_url, bio: u.bio, location: u.location, profileUrl: u.html_url }
  }
  if (p === 'gitlab') {
    const tok = await postForm<{ access_token?: string }>(`${config.oauth.gitlab.baseUrl}/oauth/token`, { client_id: config.oauth.gitlab.clientId, client_secret: config.oauth.gitlab.clientSecret, code, grant_type: 'authorization_code', redirect_uri: callbackUrl(p) })
    if (!tok.access_token) throw new Error('pas de jeton')
    const u = await getJson<{ id: number; username: string; name: string; email: string | null; avatar_url: string | null; bio: string | null; location: string | null; web_url: string }>(`${config.oauth.gitlab.baseUrl}/api/v4/user`, tok.access_token)
    return { providerId: String(u.id), handle: u.username, displayName: u.name || u.username, email: u.email, avatarUrl: u.avatar_url, bio: u.bio, location: u.location, profileUrl: u.web_url }
  }
  const tok = await postForm<{ access_token?: string }>('https://oauth2.googleapis.com/token', { client_id: config.oauth.google.clientId, client_secret: config.oauth.google.clientSecret, code, grant_type: 'authorization_code', redirect_uri: callbackUrl(p) })
  if (!tok.access_token) throw new Error('pas de jeton')
  const u = await getJson<{ sub: string; name?: string; email?: string; email_verified?: boolean; picture?: string }>('https://openidconnect.googleapis.com/v1/userinfo', tok.access_token)
  const base = (u.email?.split('@')[0] ?? `dev${u.sub.slice(-6)}`).toLowerCase().replace(/[^a-z0-9-]/g, '-')
  return { providerId: u.sub, handle: base, displayName: u.name ?? base, email: u.email_verified ? (u.email ?? null) : null, avatarUrl: u.picture ?? null, bio: null, location: null, profileUrl: null }
}

/** Échange le code, crée ou met à jour l'utilisateur, ouvre une session. */
export async function completeLogin(p: Provider, code: string, state: string) {
  const nextPath = await consumeState(p, state)
  const prof = await fetchProfile(p, code)
  const db = await getDb()
  const existing = await db.query<{ id: string }>('SELECT id FROM users WHERE provider = $1 AND provider_id = $2', [p, prof.providerId])
  let userId = existing[0]?.id
  if (userId) {
    await db.query('UPDATE users SET display_name = $2, email = COALESCE($3, email), avatar_url = $4, bio = COALESCE(bio, $5), location = COALESCE(location, $6), last_seen_at = now() WHERE id = $1', [userId, prof.displayName, prof.email, prof.avatarUrl, prof.bio, prof.location])
  } else {
    userId = randomBytes(12).toString('hex')
    // Pseudo unique : on suffixe en cas de collision entre fournisseurs
    let handle = prof.handle.toLowerCase()
    for (let i = 2; (await db.query('SELECT 1 FROM users WHERE handle = $1', [handle])).length; i++) handle = `${prof.handle.toLowerCase()}-${i}`
    await db.query('INSERT INTO users (id, provider, provider_id, handle, display_name, email, avatar_url, bio, location, profile_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [userId, p, prof.providerId, handle, prof.displayName, prof.email, prof.avatarUrl, prof.bio, prof.location, prof.profileUrl])
  }
  const sid = randomBytes(32).toString('base64url')
  await db.query(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval '30 days')`, [sid, userId])
  return { sid, nextPath }
}

export async function userFromSession(sid: string | undefined) {
  if (!sid) return null
  const db = await getDb()
  const rows = await db.query<Record<string, unknown>>(
    `SELECT u.id, u.provider, u.handle, u.display_name AS "displayName", u.email, u.avatar_url AS "avatarUrl", u.bio, u.location, u.profile_url AS "profileUrl", u.created_at AS "createdAt"
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND s.expires_at > now()`,
    [sid],
  )
  return rows[0] ?? null
}

export async function endSession(sid: string | undefined) {
  if (!sid) return
  const db = await getDb()
  await db.query('DELETE FROM sessions WHERE id = $1', [sid])
}
