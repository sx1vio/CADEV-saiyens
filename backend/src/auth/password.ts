/**
 * Comptes par e-mail et mot de passe.
 * - Mot de passe haché avec scrypt (sel aléatoire de 16 octets, comparaison à temps constant) ;
 * - mêmes sessions que l'OAuth (cookie HttpOnly, 30 jours) ;
 * - limitation simple des tentatives par adresse IP contre le bourrage d'identifiants.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { getDb } from '../db.js'

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

export async function hashPassword(pw: string) {
  const salt = randomBytes(16)
  const key = await scryptAsync(pw, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(pw: string, stored: string | null) {
  if (!stored?.startsWith('scrypt$')) return false
  const [, salt, key] = stored.split('$')
  const want = Buffer.from(key, 'base64')
  const got = await scryptAsync(pw, Buffer.from(salt, 'base64'), want.length)
  return timingSafeEqual(want, got)
}

/** 10 tentatives par IP et par quart d'heure. */
const attempts = new Map<string, { n: number; until: number }>()
export function tooManyAttempts(ip: string) {
  const now = Date.now()
  const a = attempts.get(ip)
  if (!a || a.until < now) {
    attempts.set(ip, { n: 1, until: now + 15 * 60_000 })
    return false
  }
  a.n++
  return a.n > 10
}

export class AuthError extends Error {
  constructor(
    public code: 'email_taken' | 'bad_credentials' | 'use_provider',
    message: string,
  ) {
    super(message)
  }
}

function baseHandle(name: string, email: string) {
  const raw = (name || email.split('@')[0]).normalize('NFD').replace(/[̀-ͯ]/g, '')
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'dev'
}

async function openSession(userId: string) {
  const db = await getDb()
  const sid = randomBytes(32).toString('base64url')
  await db.query(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval '30 days')`, [sid, userId])
  return sid
}

export async function register(input: { name: string; email: string; password: string }) {
  const db = await getDb()
  const email = input.email.trim().toLowerCase()
  const taken = await db.query<{ provider: string }>('SELECT provider FROM users WHERE lower(email) = $1', [email])
  if (taken.some((t) => t.provider === 'email')) throw new AuthError('email_taken', 'Un compte existe déjà avec cet e-mail.')
  const id = randomBytes(12).toString('hex')
  const base = baseHandle(input.name, email)
  let handle = base
  for (let i = 2; (await db.query('SELECT 1 FROM users WHERE handle = $1', [handle])).length; i++) handle = `${base}-${i}`
  await db.query('INSERT INTO users (id, provider, provider_id, handle, display_name, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
    id,
    'email',
    email,
    handle,
    input.name.trim(),
    email,
    await hashPassword(input.password),
  ])
  return { sid: await openSession(id) }
}

export async function login(input: { email: string; password: string }) {
  const db = await getDb()
  const email = input.email.trim().toLowerCase()
  const rows = await db.query<{ id: string; password_hash: string | null }>(`SELECT id, password_hash FROM users WHERE provider = 'email' AND lower(email) = $1`, [email])
  // On calcule un hachage même si le compte n'existe pas : même temps de réponse dans les deux cas.
  const ok = await verifyPassword(input.password, rows[0]?.password_hash ?? 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA')
  if (!rows.length || !ok) {
    const other = await db.query<{ provider: string }>(`SELECT provider FROM users WHERE lower(email) = $1 AND provider <> 'email' LIMIT 1`, [email])
    if (!rows.length && other.length) throw new AuthError('use_provider', `Ce compte se connecte avec ${other[0].provider === 'github' ? 'GitHub' : other[0].provider === 'gitlab' ? 'GitLab' : 'Google'}.`)
    throw new AuthError('bad_credentials', 'E-mail ou mot de passe incorrect.')
  }
  await db.query('UPDATE users SET last_seen_at = now() WHERE id = $1', [rows[0].id])
  return { sid: await openSession(rows[0].id) }
}

export async function savePrefs(userId: string, prefs: Record<string, unknown>, onboarded: boolean) {
  const db = await getDb()
  await db.query(`UPDATE users SET prefs = prefs || $2::jsonb, onboarded_at = CASE WHEN $3 THEN COALESCE(onboarded_at, now()) ELSE onboarded_at END WHERE id = $1`, [userId, JSON.stringify(prefs), onboarded])
}

export async function updateProfile(userId: string, p: { displayName?: string; bio?: string; location?: string }) {
  const db = await getDb()
  await db.query('UPDATE users SET display_name = COALESCE($2, display_name), bio = COALESCE($3, bio), location = COALESCE($4, location) WHERE id = $1', [userId, p.displayName ?? null, p.bio ?? null, p.location ?? null])
}
