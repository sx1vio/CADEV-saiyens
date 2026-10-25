import Parser from 'rss-parser';
import type { CollectedNews } from '../domain/news-item';
import { isTechRole, opensToAfrica } from '../domain/jobs';
import { pool } from '../domain/pool';
import type { NewsCollectors } from '../domain/ports';
import {
  CERT_FEEDS,
  CHANNELS,
  FEEDS,
  JOB_BOARDS,
  RELEASE_REPOS,
  type ChannelSource,
  type FeedSource,
  type JobBoard,
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

const recent = (d: Date, days = MAX_AGE_DAYS) =>
  Date.now() - d.getTime() < days * 864e5 && d.getTime() <= Date.now() + 3600_000;

async function collectFeed(f: FeedSource, maxAgeDays = MAX_AGE_DAYS): Promise<CollectedNews[]> {
  const feed = await parser.parseString(await fetchText(f.url));
  return feed.items
    .map((it): CollectedNews | null => {
      const url = it.link?.trim();
      const date = new Date(it.isoDate ?? it.pubDate ?? Date.now());
      if (!url || !it.title || Number.isNaN(date.getTime()) || !recent(date, maxAgeDays))
        return null;
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

// Emplois à distance. Remotive impose le lien vers l'offre et la mention de la source, et limite
// l'accès à 4 requêtes par jour (job toutes les 6 h, une seule requête). Jobicy : mêmes règles.
interface RemotiveJob {
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

async function collectRemotive(): Promise<CollectedNews[]> {
  const data = await fetchJson<{ jobs: RemotiveJob[] }>(
    'https://remotive.com/api/remote-jobs?category=software-dev',
  );
  return data.jobs
    .filter((j) => opensToAfrica(j.candidate_required_location))
    .map((j) => ({
      kind: 'job' as const,
      source: 'remotive',
      sourceName: 'Remotive',
      category: 'dev' as const,
      lang: 'en' as const,
      title: j.title,
      summary: cleanText(j.description, 240),
      url: j.url,
      image: j.company_logo || null,
      author: j.company_name,
      // Date sans fuseau dans la réponse : on la lit en UTC.
      publishedAt: new Date(`${j.publication_date}Z`),
      extra: {
        location: j.candidate_required_location,
        jobType: j.job_type,
        salary: j.salary || null,
        tags: j.tags,
      },
    }));
}

interface JobicyJob {
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobIndustry: string[];
  jobType: string[];
  jobGeo: string;
  jobLevel: string;
  jobExcerpt: string;
  pubDate: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
}

async function collectJobicy(): Promise<CollectedNews[]> {
  const data = await fetchJson<{ jobs: JobicyJob[] }>(
    'https://jobicy.com/api/v2/remote-jobs?count=50&industry=dev',
  );
  return data.jobs
    .filter((j) => opensToAfrica(j.jobGeo))
    .map((j) => ({
      kind: 'job' as const,
      source: 'jobicy',
      sourceName: 'Jobicy',
      category: 'dev' as const,
      lang: 'en' as const,
      title: decode(j.jobTitle),
      summary: cleanText(j.jobExcerpt, 240),
      url: j.url,
      image: j.companyLogo || null,
      author: decode(j.companyName),
      publishedAt: new Date(j.pubDate),
      extra: {
        location: j.jobGeo.replace(/\s+/g, ' ').trim(),
        jobType: j.jobType.join(', ').toLowerCase(),
        level: j.jobLevel,
        salary: j.salaryMin
          ? `${j.salaryMin}-${j.salaryMax ?? j.salaryMin} ${j.salaryCurrency ?? ''}/${j.salaryPeriod ?? ''}`.trim()
          : null,
        tags: j.jobIndustry,
      },
    }));
}

// Offres publiées par les entreprises sur leur propre page carrières (Greenhouse, Ashby).
interface BoardJob {
  title: string;
  location: string;
  url: string;
  publishedAt: Date;
  extra?: Record<string, unknown>;
}

async function boardJobs(b: JobBoard): Promise<BoardJob[]> {
  if (b.ats === 'greenhouse') {
    const d = await fetchJson<{
      jobs: {
        title: string;
        absolute_url: string;
        location: { name: string };
        first_published?: string;
        updated_at: string;
      }[];
    }>(`https://boards-api.greenhouse.io/v1/boards/${b.slug}/jobs`);
    return d.jobs.map((j) => ({
      title: j.title,
      location: j.location.name,
      url: j.absolute_url,
      publishedAt: new Date(j.first_published ?? j.updated_at),
    }));
  }
  const d = await fetchJson<{
    jobs: {
      title: string;
      location: string;
      secondaryLocations?: { location: string }[];
      jobUrl: string;
      publishedAt: string;
      isListed: boolean;
      employmentType?: string;
      workplaceType?: string;
    }[];
  }>(`https://api.ashbyhq.com/posting-api/job-board/${b.slug}`);
  return d.jobs
    .filter((j) => j.isListed)
    .map((j) => ({
      title: j.title,
      location: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].join(', '),
      url: j.jobUrl,
      publishedAt: new Date(j.publishedAt),
      extra: { jobType: j.employmentType, workplace: j.workplaceType },
    }));
}

const PER_COMPANY = 12;

async function collectBoard(b: JobBoard): Promise<CollectedNews[]> {
  return (await boardJobs(b))
    .filter((j) => isTechRole(j.title) && opensToAfrica(j.location))
    .sort((a, c) => c.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, PER_COMPANY)
    .map((j) => ({
      kind: 'job' as const,
      source: `jobs:${b.id}`,
      sourceName: b.name,
      category: 'dev' as const,
      lang: 'en' as const,
      title: decode(j.title),
      summary: '',
      url: j.url,
      image: null,
      author: b.name,
      publishedAt: j.publishedAt,
      extra: { location: j.location, african: !!b.africa, ...j.extra },
    }));
}

// Himalayas : offres à distance, avec les pays autorisés (liste vide = partout).
interface HimalayasJob {
  title: string;
  excerpt: string;
  companyName: string;
  companyLogo: string;
  employmentType: string;
  minSalary: number | null;
  maxSalary: number | null;
  currency: string | null;
  locationRestrictions: string[];
  categories: string[];
  guid: string;
  pubDate: number;
}

async function collectHimalayas(): Promise<CollectedNews[]> {
  const data = await fetchJson<{ jobs: HimalayasJob[] }>(
    'https://himalayas.app/jobs/api?limit=100',
  );
  return data.jobs
    .filter(
      (j) =>
        isTechRole(j.title) &&
        (j.locationRestrictions.length === 0 || j.locationRestrictions.some(opensToAfrica)),
    )
    .map((j) => ({
      kind: 'job' as const,
      source: 'himalayas',
      sourceName: 'Himalayas',
      category: 'dev' as const,
      lang: 'en' as const,
      title: decode(j.title),
      summary: cleanText(j.excerpt, 240),
      // Lien vers la fiche Himalayas, comme l'exigent ses conditions d'utilisation.
      url: j.guid,
      image: j.companyLogo || null,
      author: j.companyName,
      publishedAt: new Date(j.pubDate * 1000),
      extra: {
        location: j.locationRestrictions.join(', ') || 'Worldwide',
        jobType: j.employmentType,
        salary: j.minSalary
          ? `${j.minSalary}-${j.maxSalary ?? j.minSalary} ${j.currency ?? ''}`.trim()
          : null,
        tags: j.categories.slice(0, 3),
      },
    }));
}

// MyJobMag : offres au Nigeria, flux public. On ne garde que les métiers du numérique.
async function collectMyJobMag(): Promise<CollectedNews[]> {
  const feed = await parser.parseString(await fetchText('https://www.myjobmag.com/jobsxml.xml'));
  return feed.items
    .filter((it) => it.link && it.title && isTechRole(it.title))
    .map((it) => ({
      kind: 'job' as const,
      source: 'myjobmag',
      sourceName: 'MyJobMag',
      category: 'dev' as const,
      lang: 'en' as const,
      title: decode(it.title!).trim(),
      summary: cleanText(it.contentSnippet || it.content, 240),
      url: it.link!.trim(),
      image: null,
      author: null,
      publishedAt: new Date(it.isoDate ?? it.pubDate ?? Date.now()),
      extra: { location: 'Nigeria', african: true },
    }));
}

// Certifications : catalogue officiel Microsoft Learn (API publique, sans clé).
interface MsCertification {
  title: string;
  subtitle: string;
  url: string;
  icon_url: string;
  last_modified: string;
  certification_type: string;
  exams: string[];
  levels: string[];
  roles: string[];
}

async function collectMicrosoftCertifications(): Promise<CollectedNews[]> {
  const data = await fetchJson<{ certifications: MsCertification[] }>(
    'https://learn.microsoft.com/api/catalog/?type=certifications&locale=en-us',
  );
  return data.certifications
    .filter((c) => !/has been retired/i.test(c.subtitle))
    .map((c) => ({
      kind: 'cert' as const,
      source: 'microsoft-learn',
      sourceName: 'Microsoft Learn',
      category: 'cloud' as const,
      lang: 'en' as const,
      title: decode(c.title),
      summary: cleanText(c.subtitle, 240),
      // Le suffixe ?WT.mc_id=… est un marqueur de suivi de l'API, inutile pour le lien.
      url: c.url.split('?')[0]!,
      image: c.icon_url,
      author: 'Microsoft',
      publishedAt: new Date(c.last_modified),
      extra: {
        certificationType: c.certification_type,
        levels: c.levels,
        roles: c.roles,
        exams: c.exams.length,
      },
    }));
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

  jobs() {
    return [
      { source: 'remotive', run: collectRemotive },
      { source: 'jobicy', run: collectJobicy },
      { source: 'himalayas', run: collectHimalayas },
      { source: 'myjobmag', run: collectMyJobMag },
      ...JOB_BOARDS.map((b) => ({ source: `jobs:${b.id}`, run: () => collectBoard(b) })),
    ];
  }

  certs() {
    return [
      { source: 'microsoft-learn', run: collectMicrosoftCertifications },
      // Annonces des éditeurs : on garde 4 mois, ces billets sont rares.
      ...CERT_FEEDS.map((f) => ({
        source: f.id,
        run: async () => (await collectFeed(f, 120)).map((i) => ({ ...i, kind: 'cert' as const })),
      })),
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
