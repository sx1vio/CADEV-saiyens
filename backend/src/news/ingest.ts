/**
 * Collecte des actualités réelles : flux RSS/Atom, chaînes YouTube, Hacker News, dev.to,
 * dépôts GitHub de la semaine et radar des nouvelles versions.
 * Idempotent : un même lien n'est stocké qu'une fois (mise à jour des compteurs sinon).
 */
import { createHash } from 'node:crypto'
import Parser from 'rss-parser'
import { config } from '../config.js'
import { getDb } from '../db.js'
import { CHANNELS, FEEDS, RELEASE_REPOS, type Category } from './sources.js'

export interface NewsRow {
  kind: 'article' | 'video' | 'hn' | 'devto' | 'repo' | 'release'
  source: string
  sourceName: string
  category: Category
  lang: string
  title: string
  summary: string
  url: string
  image: string | null
  author: string | null
  publishedAt: Date
  score?: number
  comments?: number
  extra?: Record<string, unknown>
}

const UA = 'Mozilla/5.0 (compatible; DevHubBot/0.1; +https://devhub.africa/bot)'
const MAX_AGE_DAYS = 30

async function fetchText(url: string, accept = 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*', timeoutMs = 12_000): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, signal: ctrl.signal, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12_000)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

/** Exécute des tâches avec un nombre limité en parallèle. */
async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const k = i++
        try {
          out[k] = { status: 'fulfilled', value: await fn(items[k]) }
        } catch (reason) {
          out[k] = { status: 'rejected', reason }
        }
      }
    }),
  )
  return out
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' }
export function decode(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}

export function cleanText(html: string | undefined, max = 280) {
  if (!html) return ''
  const text = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/(The post|Cet article|L’article|L'article) .{0,200}(appeared first on|est apparu en premier sur).*$/i, '')
    .trim()
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text
}

const idFor = (url: string) => createHash('sha1').update(url).digest('hex').slice(0, 24)

function firstImg(html: string | undefined) {
  const m = html?.match(/<img[^>]+src=["']([^"']+)["']/i)
  return m && /^https?:\/\//.test(m[1]) ? decode(m[1]) : null
}

type Media = { $?: { url?: string; medium?: string; type?: string; width?: string } }
type FeedItem = Parser.Item & {
  mediaContent?: Media[]
  mediaThumbnail?: Media
  contentEncoded?: string
  videoId?: string
  mediaGroup?: Record<string, unknown[]>
  author?: string
  creator?: string
}

const parser = new Parser<Record<string, unknown>, FeedItem>({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
      ['yt:videoId', 'videoId'],
      ['media:group', 'mediaGroup'],
    ],
  },
})

function imageOf(it: FeedItem): string | null {
  const enc = it.enclosure
  if (enc?.url && (!enc.type || enc.type.startsWith('image'))) return enc.url
  const mc = it.mediaContent?.find((m) => m.$?.url && (m.$.medium === 'image' || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(m.$.url) || m.$.type?.startsWith('image')))
  if (mc?.$?.url) return mc.$.url
  if (it.mediaThumbnail?.$?.url) return it.mediaThumbnail.$.url
  return firstImg(it.contentEncoded) ?? firstImg(it.content)
}

function authorOf(it: FeedItem): string | null {
  const a = (it.creator ?? it.author) as unknown
  if (typeof a === 'string') return a.slice(0, 120)
  if (a && typeof a === 'object') {
    const o = a as { name?: unknown }
    const n = Array.isArray(o.name) ? o.name[0] : o.name
    return typeof n === 'string' ? n.slice(0, 120) : null
  }
  return null
}

const recent = (d: Date) => Date.now() - d.getTime() < MAX_AGE_DAYS * 864e5 && d.getTime() <= Date.now() + 3600_000

async function collectFeed(f: (typeof FEEDS)[number]): Promise<NewsRow[]> {
  const xml = await fetchText(f.url)
  const feed = await parser.parseString(xml)
  return feed.items
    .map((it): NewsRow | null => {
      const url = it.link?.trim()
      const date = new Date(it.isoDate ?? it.pubDate ?? Date.now())
      if (!url || !it.title || Number.isNaN(date.getTime()) || !recent(date)) return null
      return {
        kind: 'article',
        source: f.id,
        sourceName: f.name,
        category: f.category,
        lang: f.lang,
        title: decode(it.title).trim(),
        summary: cleanText(it.contentSnippet || it.summary || it.contentEncoded || it.content),
        url,
        image: imageOf(it),
        author: authorOf(it),
        publishedAt: date,
      }
    })
    .filter((x): x is NewsRow => !!x)
    .slice(0, 25)
}

async function collectChannel(c: (typeof CHANNELS)[number]): Promise<NewsRow[]> {
  const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.channelId}`)
  const feed = await parser.parseString(xml)
  return feed.items
    .map((it): NewsRow | null => {
      const vid = it.videoId
      const date = new Date(it.isoDate ?? it.pubDate ?? Date.now())
      if (!vid || !it.title || !recent(date)) return null
      const group = it.mediaGroup as Record<string, unknown[]> | undefined
      const desc = (group?.['media:description']?.[0] as string | undefined) ?? ''
      const community = group?.['media:community']?.[0] as Record<string, Media[]> | undefined
      const stats = (community?.['media:statistics']?.[0] as { $?: { views?: string } } | undefined)?.$
      const rating = (community?.['media:starRating']?.[0] as { $?: { count?: string } } | undefined)?.$
      // Les Shorts n'ont pas leur place dans le fil (format vertical, peu informatif)
      if (it.link?.includes('/shorts/')) return null
      return {
        kind: 'video',
        source: c.id,
        sourceName: c.name,
        category: c.category,
        lang: c.lang,
        title: decode(it.title).trim(),
        summary: cleanText(desc, 240),
        url: `https://www.youtube.com/watch?v=${vid}`,
        image: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        author: c.name,
        publishedAt: date,
        score: Number(stats?.views ?? 0),
        comments: Number(rating?.count ?? 0),
        extra: { videoId: vid, channelId: c.channelId },
      }
    })
    .filter((x): x is NewsRow => !!x)
}

interface HnItem { id: number; title?: string; url?: string; by?: string; time: number; score?: number; descendants?: number; type: string; text?: string }

async function collectHackerNews(): Promise<NewsRow[]> {
  const ids = (await fetchJson<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0, 40)
  const res = await pool(ids, 10, (id) => fetchJson<HnItem>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`))
  return res
    .filter((r): r is PromiseFulfilledResult<HnItem> => r.status === 'fulfilled' && !!r.value?.title && r.value.type === 'story')
    .map(({ value: h }) => {
      const discussion = `https://news.ycombinator.com/item?id=${h.id}`
      let domain = ''
      try {
        domain = h.url ? new URL(h.url).hostname.replace(/^www\./, '') : 'news.ycombinator.com'
      } catch {
        domain = ''
      }
      return {
        kind: 'hn' as const,
        source: 'hackernews',
        sourceName: 'Hacker News',
        category: 'dev' as const,
        lang: 'en',
        title: decode(h.title!),
        summary: cleanText(h.text, 200),
        url: discussion,
        image: null,
        author: h.by ?? null,
        publishedAt: new Date(h.time * 1000),
        score: h.score ?? 0,
        comments: h.descendants ?? 0,
        extra: { link: h.url ?? discussion, domain, hnId: h.id },
      }
    })
}

interface DevtoArticle { title: string; description: string; url: string; cover_image: string | null; social_image: string | null; published_at: string; positive_reactions_count: number; comments_count: number; tag_list: string[]; reading_time_minutes: number; user: { name: string; username: string; profile_image_90: string } }

async function collectDevto(): Promise<NewsRow[]> {
  const list = await fetchJson<DevtoArticle[]>('https://dev.to/api/articles?top=7&per_page=30')
  return list.map((a) => ({
    kind: 'devto' as const,
    source: 'devto',
    sourceName: 'DEV Community',
    category: 'dev' as const,
    lang: 'en',
    title: a.title,
    summary: cleanText(a.description, 220),
    url: a.url,
    image: a.cover_image ?? a.social_image,
    author: a.user.name,
    publishedAt: new Date(a.published_at),
    score: a.positive_reactions_count,
    comments: a.comments_count,
    extra: { tags: a.tag_list, readingTime: a.reading_time_minutes, avatar: a.user.profile_image_90, username: a.user.username },
  }))
}

const ghHeaders = (): Record<string, string> => ({ Accept: 'application/vnd.github+json', ...(config.githubToken ? { Authorization: `Bearer ${config.githubToken}` } : {}) })

interface GhRepo { full_name: string; description: string | null; html_url: string; stargazers_count: number; forks_count: number; language: string | null; created_at: string; topics?: string[]; owner: { login: string; avatar_url: string } }

async function collectTrendingRepos(): Promise<NewsRow[]> {
  const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
  const data = await fetchJson<{ items: GhRepo[] }>(`https://api.github.com/search/repositories?q=created:%3E${since}&sort=stars&order=desc&per_page=25`, ghHeaders())
  return data.items.map((r) => ({
    kind: 'repo' as const,
    source: 'github-trending',
    sourceName: 'GitHub',
    category: 'dev' as const,
    lang: 'en',
    title: r.full_name,
    summary: cleanText(r.description ?? '', 220),
    url: r.html_url,
    image: r.owner.avatar_url,
    author: r.owner.login,
    publishedAt: new Date(r.created_at),
    score: r.stargazers_count,
    comments: r.forks_count,
    extra: { language: r.language, topics: r.topics ?? [] },
  }))
}

interface GhRelease { tag_name: string; name: string | null; html_url: string; published_at: string; body: string | null; prerelease: boolean }

async function collectReleases(): Promise<NewsRow[]> {
  const res = await pool(RELEASE_REPOS, 4, async (repo): Promise<NewsRow> => {
    const r = await fetchJson<GhRelease>(`https://api.github.com/repos/${repo}/releases/latest`, ghHeaders())
    const owner = repo.split('/')[0]
    return {
      kind: 'release' as const,
      source: 'github-releases',
      sourceName: 'GitHub Releases',
      category: 'dev' as const,
      lang: 'en',
      title: `${repo.split('/')[1]} ${r.tag_name}`,
      summary: cleanText((r.body ?? '').replace(/[#*`>_-]+/g, ' '), 220),
      url: r.html_url,
      image: `https://github.com/${owner}.png?size=80`,
      author: owner,
      publishedAt: new Date(r.published_at),
      extra: { repo, tag: r.tag_name, name: r.name },
    }
  })
  return res.filter((r): r is PromiseFulfilledResult<NewsRow> => r.status === 'fulfilled').map((r) => r.value)
}

/** Dernier recours pour l'image : la balise Open Graph de l'article. */
async function ogImage(url: string): Promise<string | null> {
  const html = (await fetchText(url, 'text/html', 8_000)).slice(0, 250_000)
  const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i) ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i)
  return m ? decode(m[1]) : null
}

async function save(rows: NewsRow[]) {
  const db = await getDb()
  let n = 0
  for (const r of rows) {
    await db.query(
      `INSERT INTO news_items (id, kind, source, source_name, category, lang, title, summary, url, image, author, published_at, score, comments, extra)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (url) DO UPDATE SET
         title = EXCLUDED.title, summary = EXCLUDED.summary,
         image = COALESCE(EXCLUDED.image, news_items.image),
         score = EXCLUDED.score, comments = EXCLUDED.comments,
         extra = EXCLUDED.extra, fetched_at = now()`,
      [idFor(r.url), r.kind, r.source, r.sourceName, r.category, r.lang, r.title.slice(0, 400), r.summary, r.url, r.image, r.author, r.publishedAt.toISOString(), r.score ?? 0, r.comments ?? 0, JSON.stringify(r.extra ?? {})],
    )
    n++
  }
  return n
}

let running = false
let lastGithub = 0

/** Une passe complète de collecte. Retourne un résumé (journalisé dans ingest_runs). */
export async function ingestAll(log: (msg: string) => void = console.log) {
  if (running) return { skipped: true }
  running = true
  const db = await getDb()
  const [{ id: runId }] = await db.query<{ id: number }>('INSERT INTO ingest_runs DEFAULT VALUES RETURNING id')
  const errors: { source: string; error: string }[] = []
  let ok = 0
  let total = 0
  const t0 = Date.now()
  try {
    const jobs: { source: string; run: () => Promise<NewsRow[]> }[] = [
      ...FEEDS.map((f) => ({ source: f.id, run: () => collectFeed(f) })),
      ...CHANNELS.map((c) => ({ source: `yt:${c.id}`, run: () => collectChannel(c) })),
      { source: 'hackernews', run: collectHackerNews },
      { source: 'devto', run: collectDevto },
    ]
    // L'API GitHub non authentifiée est limitée à 60 requêtes/heure : une passe par heure.
    if (Date.now() - lastGithub > 55 * 60_000) {
      jobs.push({ source: 'github-trending', run: collectTrendingRepos }, { source: 'github-releases', run: collectReleases })
      lastGithub = Date.now()
    }
    const results = await pool(jobs, 6, async (j) => {
      const rows = await j.run()
      return { source: j.source, rows }
    })
    for (const [i, r] of results.entries()) {
      if (r.status === 'fulfilled') {
        ok++
        total += await save(r.value.rows)
      } else errors.push({ source: jobs[i].source, error: String((r.reason as Error)?.message ?? r.reason) })
    }

    // Images manquantes : balise Open Graph de l'article (limité pour rester poli avec les sites)
    const missing = await db.query<{ id: string; url: string }>(`SELECT id, url FROM news_items WHERE image IS NULL AND kind = 'article' AND (extra->>'ogTried') IS NULL ORDER BY published_at DESC LIMIT 60`)
    await pool(missing, 6, async (m) => {
      const img = await ogImage(m.url).catch(() => null)
      await db.query(`UPDATE news_items SET image = $2, extra = extra || '{"ogTried":true}'::jsonb WHERE id = $1`, [m.id, img])
    })

    // Purge : on garde 45 jours d'historique (les versions restent)
    await db.query(`DELETE FROM news_items WHERE kind <> 'release' AND published_at < now() - interval '45 days'`)
  } finally {
    await db.query('UPDATE ingest_runs SET finished_at = now(), items = $2, sources_ok = $3, errors = $4 WHERE id = $1', [runId, total, ok, JSON.stringify(errors)])
    running = false
  }
  log(`[ingest] ${ok} sources OK, ${errors.length} en échec, ${total} éléments, ${Math.round((Date.now() - t0) / 1000)} s`)
  if (errors.length) log(`[ingest] échecs : ${errors.map((e) => `${e.source} (${e.error})`).join(', ')}`)
  return { ok, failed: errors.length, items: total }
}
