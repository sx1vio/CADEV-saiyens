/**
 * API DevHub Africa.
 * Toutes les routes sont sous /api ; en développement le front (Vite) les proxifie,
 * en production le proxy HTTPS (Caddy) les sert sur le même domaine que le front.
 */
import compress from '@fastify/compress'
import cookie from '@fastify/cookie'
import Fastify from 'fastify'
import { z } from 'zod'
import { authorizeUrl, completeLogin, configuredProviders, endSession, userFromSession } from './auth/oauth.js'
import { config, type Provider } from './config.js'
import { getDb } from './db.js'
import { ingestAll } from './news/ingest.js'
import { homePayload, listNews, sourcesList } from './news/query.js'
import { imageRoutes } from './routes/img.js'

const app = Fastify({ logger: { level: config.isProd ? 'info' : 'warn' }, trustProxy: true })
await app.register(cookie)
// Réponses compressées (brotli/gzip) : l'accueil passe de ~95 Ko à ~20 Ko
await app.register(compress, { global: true, threshold: 1024 })
await app.register(imageRoutes)

const SID = 'dh_sid'
const PROVIDERS = ['github', 'gitlab', 'google'] as const

/* ---------------- Santé et état ---------------- */

app.get('/api/health', async () => {
  const db = await getDb()
  const [run] = await db.query<{ finished_at: string | null; items: number; sources_ok: number; errors: unknown }>('SELECT finished_at, items, sources_ok, errors FROM ingest_runs ORDER BY id DESC LIMIT 1')
  const [{ n }] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM news_items')
  return { ok: true, db: db.kind, newsItems: n, lastIngest: run ?? null, providers: configuredProviders() }
})

/* ---------------- Actualités ---------------- */

app.get('/api/news/home', async (req, reply) => {
  const { lang } = z.object({ lang: z.enum(['fr', 'en', 'all']).optional() }).parse(req.query)
  reply.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600')
  return homePayload(lang)
})

const listQuery = z.object({
  category: z.string().max(20).optional(),
  kind: z.enum(['article', 'video', 'hn', 'devto', 'repo', 'release']).optional(),
  lang: z.enum(['fr', 'en', 'all']).optional(),
  q: z.string().max(80).optional(),
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

app.get('/api/news', async (req, reply) => {
  const q = listQuery.parse(req.query)
  reply.header('Cache-Control', 'public, max-age=120')
  return { items: await listNews(q) }
})

app.get('/api/videos', async (req, reply) => {
  const q = listQuery.parse(req.query)
  reply.header('Cache-Control', 'public, max-age=300')
  return { items: await listNews({ ...q, kind: 'video' }) }
})

app.get('/api/news/sources', async () => ({ sources: await sourcesList() }))

/* ---------------- Connexion (OAuth) ---------------- */

app.get('/api/auth/providers', async () => configuredProviders())

app.get<{ Params: { provider: string }; Querystring: { next?: string } }>('/api/auth/:provider', async (req, reply) => {
  const p = z.enum(PROVIDERS).safeParse(req.params.provider)
  if (!p.success) return reply.code(404).send({ error: 'fournisseur inconnu' })
  if (!configuredProviders()[p.data]) return reply.code(501).send({ error: `Connexion ${p.data} non configurée : renseigner ${p.data.toUpperCase()}_CLIENT_ID et ${p.data.toUpperCase()}_CLIENT_SECRET (voir backend/.env.example).` })
  return reply.redirect(await authorizeUrl(p.data, req.query.next ?? '/'))
})

app.get<{ Params: { provider: string }; Querystring: { code?: string; state?: string; error?: string } }>('/api/auth/:provider/callback', async (req, reply) => {
  const p = z.enum(PROVIDERS).safeParse(req.params.provider)
  if (!p.success || !req.query.code || !req.query.state) return reply.redirect(`${config.appUrl}/connexion?erreur=oauth`)
  try {
    const { sid, nextPath } = await completeLogin(p.data as Provider, req.query.code, req.query.state)
    reply.setCookie(SID, sid, { path: '/', httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: 30 * 24 * 3600 })
    return reply.redirect(`${config.appUrl}/connexion?oauth=ok&next=${encodeURIComponent(nextPath)}`)
  } catch (e) {
    req.log.warn({ err: e }, 'échec OAuth')
    return reply.redirect(`${config.appUrl}/connexion?erreur=oauth`)
  }
})

app.get('/api/me', async (req, reply) => {
  const user = await userFromSession(req.cookies[SID])
  if (!user) return reply.code(401).send({ error: 'non connecté' })
  return user
})

app.post('/api/auth/logout', async (req, reply) => {
  await endSession(req.cookies[SID])
  reply.clearCookie(SID, { path: '/' })
  return { ok: true }
})

/* ---------------- Démarrage ---------------- */

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof z.ZodError) return reply.code(400).send({ error: 'paramètres invalides', details: err.issues })
  app.log.error(err)
  return reply.code(500).send({ error: 'erreur interne' })
})

await getDb()
await app.listen({ port: config.port, host: config.host })
console.log(`API DevHub sur http://${config.host}:${config.port} (base : ${(await getDb()).kind})`)

if (!config.ingestDisabled) {
  // Première collecte en arrière-plan, puis à intervalle régulier
  setTimeout(() => void ingestAll().catch((e) => console.error('[ingest]', e)), 1500)
  setInterval(() => void ingestAll().catch((e) => console.error('[ingest]', e)), config.ingestEveryMinutes * 60_000)
}
