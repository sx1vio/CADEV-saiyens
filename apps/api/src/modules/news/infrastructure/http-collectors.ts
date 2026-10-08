import Parser from 'rss-parser';
import type { CollectedNews } from '../domain/news-item';
import { pool } from '../domain/pool';
import type { NewsCollectors } from '../domain/ports';
import {
  CHANNELS,
  FEEDS,
  RELEASE_REPOS,
  type ChannelSource,
  type FeedSource,
} from '../domain/sources';
import { cleanText, decode, firstImage } from '../domain/text';

// Collecte réelle : flux RSS/Atom, chaînes YouTube, Hacker News, dev.to, GitHub (dépôts de la
// semaine et nouvelles versions). On ne garde que le titre, un court extrait et le lien.

const UA = 'Mozilla/5.0 (compatible; DevHubBot/0.1; +https://devhub.africa/bot)';
const MAX_AGE_DAYS = 30;

async function fetchText(
  url: string,
  accept = 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  timeoutMs = 12_000,
): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: accept },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

type Media = { $?: { url?: string; medium?: string; type?: string; width?: string } };
type FeedItem = Parser.Item & {
  mediaContent?: Media[];
  mediaThumbnail?: Media;
  contentEncoded?: string;
  videoId?: string;
  mediaGroup?: Record<string, unknown[]>;
  author?: unknown;
  creator?: string;
};

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
});

function imageOf(it: FeedItem): string | null {
  const enc = it.enclosure;
  if (enc?.url && (!enc.type || enc.type.startsWith('image'))) return enc.url;
  const mc = it.mediaContent?.find(
    (m) =>
      m.$?.url &&
      (m.$.medium === 'image' ||
        /\.(jpe?g|png|webp|gif)(\?|$)/i.test(m.$.url) ||
        m.$.type?.startsWith('image')),
  );
  if (mc?.$?.url) return mc.$.url;
  if (it.mediaThumbnail?.$?.url) return it.mediaThumbnail.$.url;
  return firstImage(it.contentEncoded) ?? firstImage(it.content);
}

function authorOf(it: FeedItem): string | null {
  const a = it.creator ?? it.author;
  if (typeof a === 'string') return a.slice(0, 120);
  if (a && typeof a === 'object') {
    const o = a as { name?: unknown };
    const n: unknown = Array.isArray(o.name) ? o.name[0] : o.name;
    return typeof n === 'string' ? n.slice(0, 120) : null;
  }
  return null;
}

const recent = (d: Date) =>
  Date.now() - d.getTime() < MAX_AGE_DAYS * 864e5 && d.getTime() <= Date.now() + 3600_000;

async function collectFeed(f: FeedSource): Promise<CollectedNews[]> {
  const feed = await parser.parseString(await fetchText(f.url));
  return feed.items
    .map((it): CollectedNews | null => {
      const url = it.link?.trim();
      const date = new Date(it.isoDate ?? it.pubDate ?? Date.now());
      if (!url || !it.title || Number.isNaN(date.getTime()) || !recent(date)) return null;
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
      };
    })
    .filter((x): x is CollectedNews => !!x)
    .slice(0, 25);
}

async function collectChannel(c: ChannelSource): Promise<CollectedNews[]> {
  const feed = await parser.parseString(
    await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.channelId}`),
  );
  return feed.items
    .map((it): CollectedNews | null => {
      const vid = it.videoId;
      const date = new Date(it.isoDate ?? it.pubDate ?? Date.now());
      // Les Shorts n'ont pas leur place dans le fil (format vertical, peu informatif)
      if (!vid || !it.title || !recent(date) || it.link?.includes('/shorts/')) return null;
      const group = it.mediaGroup;
      const desc = (group?.['media:description']?.[0] as string | undefined) ?? '';
      const community = group?.['media:community']?.[0] as Record<string, unknown[]> | undefined;
      const stats = (community?.['media:statistics']?.[0] as { $?: { views?: string } } | undefined)
        ?.$;
      const rating = (
        community?.['media:starRating']?.[0] as { $?: { count?: string } } | undefined
      )?.$;
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
      };
    })
    .filter((x): x is CollectedNews => !!x);
}

interface HnItem {
  id: number;
  title?: string;
  url?: string;
  by?: string;
  time: number;
  score?: number;
  descendants?: number;
  type: string;
  text?: string;
}

async function collectHackerNews(): Promise<CollectedNews[]> {
  const ids = (
    await fetchJson<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json')
  ).slice(0, 40);
  const res = await pool(ids, 10, (id) =>
    fetchJson<HnItem>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`),
  );
  return res
    .filter(
      (r): r is PromiseFulfilledResult<HnItem> =>
        r.status === 'fulfilled' && !!r.value?.title && r.value.type === 'story',
    )
    .map(({ value: h }) => {
      const discussion = `https://news.ycombinator.com/item?id=${h.id}`;
      let domain = 'news.ycombinator.com';
      try {
        if (h.url) domain = new URL(h.url).hostname.replace(/^www\./, '');
      } catch {
        domain = '';
      }
      return {
        kind: 'hn' as const,
        source: 'hackernews',
        sourceName: 'Hacker News',
        category: 'dev' as const,
        lang: 'en' as const,
        title: decode(h.title!),
        summary: cleanText(h.text, 200),
        url: discussion,
        image: null,
        author: h.by ?? null,
        publishedAt: new Date(h.time * 1000),
        score: h.score ?? 0,
        comments: h.descendants ?? 0,
        extra: { link: h.url ?? discussion, domain, hnId: h.id },
      };
    });
}

interface DevtoArticle {
  title: string;
  description: string;
  url: string;
  cover_image: string | null;
  social_image: string | null;
  published_at: string;
  positive_reactions_count: number;
  comments_count: number;
  tag_list: string[];
  reading_time_minutes: number;
  user: { name: string; username: string; profile_image_90: string };
}

async function collectDevto(): Promise<CollectedNews[]> {
  const list = await fetchJson<DevtoArticle[]>('https://dev.to/api/articles?top=7&per_page=30');
  return list.map((a) => ({
    kind: 'devto' as const,
    source: 'devto',
    sourceName: 'DEV Community',
    category: 'dev' as const,
    lang: 'en' as const,
    title: a.title,
    summary: cleanText(a.description, 220),
    url: a.url,
    image: a.cover_image ?? a.social_image,
    author: a.user.name,
    publishedAt: new Date(a.published_at),
    score: a.positive_reactions_count,
    comments: a.comments_count,
    extra: {
      tags: a.tag_list,
      readingTime: a.reading_time_minutes,
      avatar: a.user.profile_image_90,
      username: a.user.username,
    },
  }));
}

const GH_HEADERS = { Accept: 'application/vnd.github+json' };

interface GhRepo {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  topics?: string[];
  owner: { login: string; avatar_url: string };
}

async function collectTrendingRepos(): Promise<CollectedNews[]> {
  const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const data = await fetchJson<{ items: GhRepo[] }>(
    `https://api.github.com/search/repositories?q=created:%3E${since}&sort=stars&order=desc&per_page=25`,
    GH_HEADERS,
  );
  return data.items.map((r) => ({
    kind: 'repo' as const,
    source: 'github-trending',
    sourceName: 'GitHub',
    category: 'dev' as const,
    lang: 'en' as const,
    title: r.full_name,
    summary: cleanText(r.description ?? '', 220),
    url: r.html_url,
    image: r.owner.avatar_url,
    author: r.owner.login,
    publishedAt: new Date(r.created_at),
    score: r.stargazers_count,
    comments: r.forks_count,
    extra: { language: r.language, topics: r.topics ?? [] },
  }));
}

interface GhRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string;
  body: string | null;
}

async function collectReleases(): Promise<CollectedNews[]> {
  const res = await pool(RELEASE_REPOS, 4, async (repo): Promise<CollectedNews> => {
    const r = await fetchJson<GhRelease>(
      `https://api.github.com/repos/${repo}/releases/latest`,
      GH_HEADERS,
    );
    const [owner, name] = repo.split('/') as [string, string];
    return {
      kind: 'release',
      source: 'github-releases',
      sourceName: 'GitHub Releases',
      category: 'dev',
      lang: 'en',
      title: `${name} ${r.tag_name}`,
      summary: cleanText((r.body ?? '').replace(/[#*`>_-]+/g, ' '), 220),
      url: r.html_url,
      image: `https://github.com/${owner}.png?size=80`,
      author: owner,
      publishedAt: new Date(r.published_at),
      extra: { repo, tag: r.tag_name, name: r.name },
    };
  });
  return res
    .filter((r): r is PromiseFulfilledResult<CollectedNews> => r.status === 'fulfilled')
    .map((r) => r.value);
}

export class HttpNewsCollectors implements NewsCollectors {
  feeds() {
    return [
      ...FEEDS.map((f) => ({ source: f.id, run: () => collectFeed(f) })),
      ...CHANNELS.map((c) => ({ source: `yt:${c.id}`, run: () => collectChannel(c) })),
      { source: 'hackernews', run: collectHackerNews },
      { source: 'devto', run: collectDevto },
    ];
  }

  // L'API GitHub non authentifiée est limitée à 60 requêtes/heure : job séparé, une fois par heure.
  github() {
    return [
      { source: 'github-trending', run: collectTrendingRepos },
      { source: 'github-releases', run: collectReleases },
    ];
  }

  /** Dernier recours pour l'image : la balise Open Graph de l'article. */
  async ogImage(url: string): Promise<string | null> {
    const html = (await fetchText(url, 'text/html', 8_000)).slice(0, 250_000);
    const m =
      html.match(
        /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i,
      );
    return m?.[1] ? decode(m[1]) : null;
  }
}
