/** Lecture des actualités pour le front : accueil structuré, listes filtrées, sources. */
import { getDb } from '../db.js'
import { CATEGORY_LABEL, CHANNELS, FEEDS, type Category } from './sources.js'

export interface NewsItem {
  id: string
  kind: string
  source: string
  sourceName: string
  category: string
  lang: string
  title: string
  summary: string
  url: string
  image: string | null
  author: string | null
  publishedAt: string
  score: number
  comments: number
  extra: Record<string, unknown>
}

interface Row {
  id: string
  kind: string
  source: string
  source_name: string
  category: string
  lang: string
  title: string
  summary: string
  url: string
  image: string | null
  author: string | null
  published_at: Date | string
  score: number
  comments: number
  extra: Record<string, unknown> | string
}

const map = (r: Row): NewsItem => ({
  id: r.id,
  kind: r.kind,
  source: r.source,
  sourceName: r.source_name,
  category: r.category,
  lang: r.lang,
  title: r.title,
  summary: r.summary,
  url: r.url,
  image: r.image,
  author: r.author,
  publishedAt: new Date(r.published_at).toISOString(),
  score: Number(r.score),
  comments: Number(r.comments),
  extra: typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra,
})

/** Contenus commerciaux sans intérêt pour des devs (promos, « bons plans »). */
const NOISE = `title !~* '(\\mdeals?\\M|prime day|black friday|% off|\\mcoupon|bon plan|bons plans|soldes|promo |code promo|meilleures offres|best .* deals)'`

const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'with', 'its', 'is', 'le', 'la', 'les', 'de', 'des', 'du', 'et', 'un', 'une', 'pour', 'sur', 'en', 'au', 'aux'])
const words = (t: string) => new Set(t.toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)))

/** Deux titres parlent-ils du même sujet ? (recouvrement des mots significatifs) */
function similar(a: Set<string>, b: Set<string>) {
  let common = 0
  for (const w of a) if (b.has(w)) common++
  return common / Math.max(1, Math.min(a.size, b.size)) >= 0.5
}

/** Garde au plus `perSource` éléments par source et écarte les doublons de sujet, pour un fil varié. */
function diverse(items: NewsItem[], n: number, perSource = 2) {
  const count = new Map<string, number>()
  const out: NewsItem[] = []
  const seen: Set<string>[] = []
  for (const it of items) {
    const c = count.get(it.source) ?? 0
    if (c >= perSource) continue
    const w = words(it.title)
    if (seen.some((s) => similar(s, w))) continue
    seen.push(w)
    count.set(it.source, c + 1)
    out.push(it)
    if (out.length >= n) break
  }
  return out
}

function langFilter(lang?: string) {
  return lang === 'fr' || lang === 'en' ? ` AND lang = '${lang}'` : ''
}

export async function listNews(opts: { category?: string; kind?: string; lang?: string; q?: string; before?: string; limit?: number }) {
  const db = await getDb()
  const where: string[] = [NOISE]
  const params: unknown[] = []
  if (opts.category) {
    params.push(opts.category)
    where.push(`category = $${params.length}`)
  }
  if (opts.kind) {
    params.push(opts.kind)
    where.push(`kind = $${params.length}`)
  }
  if (opts.q) {
    params.push(`%${opts.q}%`)
    where.push(`(title ILIKE $${params.length} OR summary ILIKE $${params.length})`)
  }
  if (opts.before) {
    params.push(opts.before)
    where.push(`published_at < $${params.length}`)
  }
  params.push(Math.min(100, Math.max(1, opts.limit ?? 30)))
  const rows = await db.query<Row>(`SELECT * FROM news_items WHERE ${where.join(' AND ')}${langFilter(opts.lang)} ORDER BY published_at DESC LIMIT $${params.length}`, params)
  return rows.map(map)
}

const latest = async (sql: string, limit: number, lang?: string) => {
  const db = await getDb()
  return (await db.query<Row>(`SELECT * FROM news_items WHERE ${NOISE} AND ${sql}${langFilter(lang)} ORDER BY published_at DESC LIMIT ${limit}`)).map(map)
}

/** Charge utile de l'accueil : tout ce qu'il faut pour être à l'affût en un seul appel. */
export async function homePayload(lang?: string) {
  const sections: Record<string, NewsItem[]> = {}
  const cats: Category[] = ['ia', 'tech', 'apple', 'google', 'samsung', 'mobile', 'dev', 'cloud', 'afrique']
  for (const c of cats) {
    const items = await latest(`kind = 'article' AND category = '${c}'`, 60, lang)
    // Les articles illustrés d'abord, puis les autres, en gardant l'ordre chronologique
    const withImg = items.filter((i) => i.image)
    sections[c] = diverse([...withImg, ...items.filter((i) => !i.image)], 8, 3)
  }
  const fresh = await latest(`kind = 'article' AND image IS NOT NULL AND published_at > now() - interval '36 hours' AND category IN ('ia','tech','apple','google','samsung','dev')`, 80, lang)
  const hero = diverse(fresh, 5, 1)
  const db = await getDb()
  const videos = diverse(await latest(`kind = 'video'`, 80, lang), 16, 2)
  const hn = (await db.query<Row>(`SELECT * FROM news_items WHERE kind = 'hn' AND fetched_at > now() - interval '6 hours' ORDER BY score DESC LIMIT 15`)).map(map)
  const devto = (await db.query<Row>(`SELECT * FROM news_items WHERE kind = 'devto' AND published_at > now() - interval '10 days' ORDER BY score DESC LIMIT 10`)).map(map)
  const repos = (await db.query<Row>(`SELECT * FROM news_items WHERE kind = 'repo' AND fetched_at > now() - interval '3 days' ORDER BY score DESC LIMIT 12`)).map(map)
  const releases = (await db.query<Row>(`SELECT * FROM news_items WHERE kind = 'release' ORDER BY published_at DESC LIMIT 18`)).map(map)
  const [run] = await db.query<{ finished_at: string | null; items: number; sources_ok: number }>(`SELECT finished_at, items, sources_ok FROM ingest_runs WHERE finished_at IS NOT NULL ORDER BY id DESC LIMIT 1`)
  return {
    hero,
    sections,
    sectionLabels: CATEGORY_LABEL,
    videos,
    hn,
    devto,
    repos,
    releases,
    updatedAt: run?.finished_at ?? null,
    sources: FEEDS.length + CHANNELS.length + 4,
  }
}

export async function sourcesList() {
  const db = await getDb()
  const counts = await db.query<{ source: string; n: number; last: string }>(`SELECT source, count(*)::int AS n, max(published_at)::text AS last FROM news_items GROUP BY source`)
  const by = new Map(counts.map((c) => [c.source, c]))
  return [
    ...FEEDS.map((f) => ({ id: f.id, name: f.name, kind: 'rss', category: f.category, lang: f.lang, homepage: f.homepage, items: by.get(f.id)?.n ?? 0, last: by.get(f.id)?.last ?? null })),
    ...CHANNELS.map((c) => ({ id: `yt:${c.id}`, name: c.name, kind: 'youtube', category: c.category, lang: c.lang, homepage: `https://www.youtube.com/channel/${c.channelId}`, items: by.get(c.id)?.n ?? 0, last: by.get(c.id)?.last ?? null })),
    { id: 'hackernews', name: 'Hacker News', kind: 'api', category: 'dev', lang: 'en', homepage: 'https://news.ycombinator.com', items: by.get('hackernews')?.n ?? 0, last: by.get('hackernews')?.last ?? null },
    { id: 'devto', name: 'DEV Community', kind: 'api', category: 'dev', lang: 'en', homepage: 'https://dev.to', items: by.get('devto')?.n ?? 0, last: by.get('devto')?.last ?? null },
    { id: 'github-trending', name: 'GitHub · dépôts de la semaine', kind: 'api', category: 'dev', lang: 'en', homepage: 'https://github.com', items: by.get('github-trending')?.n ?? 0, last: by.get('github-trending')?.last ?? null },
    { id: 'github-releases', name: 'GitHub · nouvelles versions', kind: 'api', category: 'dev', lang: 'en', homepage: 'https://github.com', items: by.get('github-releases')?.n ?? 0, last: by.get('github-releases')?.last ?? null },
  ]
}
