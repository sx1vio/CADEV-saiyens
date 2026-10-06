/**
 * Proxy d'images : redimensionne, convertit en WebP et met en cache les illustrations d'articles.
 * - Économie de data : une vignette de 640 px pèse ~40 Ko au lieu de ~600 Ko pour l'original.
 * - Vie privée : le navigateur du lecteur ne contacte pas les sites tiers.
 * - Sécurité : seules les adresses publiques en http(s) sont autorisées (pas de SSRF vers le réseau interne).
 */
import { createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { isIP } from 'node:net'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import sharp from 'sharp'
import { z } from 'zod'
import { config } from '../config.js'

const WIDTHS = [160, 320, 480, 640, 960, 1280] as const
const MAX_BYTES = 15 * 1024 * 1024
const dir = join(config.dataDir, '..', 'img')

function privateAddress(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  }
  const v6 = ip.toLowerCase()
  return v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:127.') || v6 === '::'
}

async function assertPublic(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocole refusé')
  const addrs = await lookup(url.hostname, { all: true })
  if (!addrs.length || addrs.some((a) => privateAddress(a.address))) throw new Error('adresse refusée')
}

export async function imageRoutes(app: FastifyInstance) {
  await mkdir(dir, { recursive: true })
  app.get('/api/img', async (req, reply) => {
    const q = z.object({ u: z.string().url().max(2000), w: z.coerce.number().int().optional() }).parse(req.query)
    const w = WIDTHS.reduce((best, x) => (Math.abs(x - (q.w ?? 640)) < Math.abs(best - (q.w ?? 640)) ? x : best), 640)
    const file = join(dir, `${createHash('sha1').update(`${q.u}|${w}`).digest('hex')}.webp`)
    reply.header('Cache-Control', 'public, max-age=604800, immutable')
    reply.type('image/webp')
    try {
      return await readFile(file)
    } catch {
      /* pas encore en cache */
    }
    try {
      const url = new URL(q.u)
      await assertPublic(url)
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 10_000)
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DevHubBot/0.1)', Accept: 'image/*' }, redirect: 'follow' })
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('image trop lourde')
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > MAX_BYTES) throw new Error('image trop lourde')
      const out = await sharp(buf, { failOn: 'none', limitInputPixels: 40_000_000 }).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 72, effort: 3 }).toBuffer()
      await writeFile(file, out).catch(() => {})
      return out
    } catch (e) {
      reply.header('Cache-Control', 'public, max-age=600')
      return reply.code(502).type('application/json').send({ error: String((e as Error).message) })
    }
  })
}
