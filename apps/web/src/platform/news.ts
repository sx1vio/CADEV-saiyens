/**
 * Client des actualités réelles (apps/api, module news : /api/v1/news) : IA, tech, Apple, Google, Samsung, dev,
 * vidéos YouTube, Hacker News, dev.to, dépôts GitHub, nouvelles versions.
 * La dernière réponse est gardée sur l'appareil : l'accueil reste lisible hors ligne.
 */
import { storageGet, storageSet } from '@/lib/utils';

export interface NewsItem {
  id: string;
  kind: 'article' | 'video' | 'hn' | 'devto' | 'repo' | 'release' | 'job' | 'cert' | 'skill';
  source: string;
  sourceName: string;
  category: string;
  lang: 'fr' | 'en';
  title: string;
  summary: string;
  url: string;
  image: string | null;
  author: string | null;
  publishedAt: string;
  score: number;
  comments: number;
  extra: Record<string, unknown>;
}

export interface HomeNews {
  hero: NewsItem[];
  sections: Record<string, NewsItem[]>;
  sectionLabels: Record<string, string>;
  videos: NewsItem[];
  hn: NewsItem[];
  devto: NewsItem[];
  repos: NewsItem[];
  releases: NewsItem[];
  updatedAt: string | null;
  sources: number;
  /** Réponse servie depuis l'appareil (pas de réseau) */
  offline?: boolean;
}

export type Lang = 'all' | 'fr' | 'en';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchHome(lang: Lang = 'all'): Promise<HomeNews> {
  const key = `dh-news-home-${lang}`;
  try {
    const data = await get<HomeNews>(`/api/v1/news/home?lang=${lang}`);
    storageSet(key, JSON.stringify(data));
    return data;
  } catch (e) {
    const cached = storageGet(key);
    if (cached) return { ...(JSON.parse(cached) as HomeNews), offline: true };
    throw e;
  }
}

export async function fetchNews(params: {
  category?: string;
  kind?: string;
  lang?: Lang;
  q?: string;
  before?: string;
  limit?: number;
}): Promise<NewsItem[]> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== '' && v !== 'all') q.set(k, String(v));
  return (await get<{ items: NewsItem[] }>(`/api/v1/news?${q}`)).items;
}

export async function fetchVideos(params: {
  category?: string;
  lang?: Lang;
  limit?: number;
  before?: string;
}): Promise<NewsItem[]> {
  const key = `dh-videos-${params.category ?? 'all'}-${params.lang ?? 'all'}`;
  try {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (v !== undefined && v !== 'all' && v !== '') q.set(k, String(v));
    const items = (await get<{ items: NewsItem[] }>(`/api/v1/videos?${q}`)).items;
    if (!params.before) storageSet(key, JSON.stringify(items));
    return items;
  } catch (e) {
    const cached = storageGet(key);
    if (cached && !params.before) return JSON.parse(cached) as NewsItem[];
    throw e;
  }
}

/** Image via le proxy du serveur : redimensionnée, en WebP, mise en cache (économie de data). */
export const img = (url: string | null | undefined, w = 640) =>
  url ? `/api/v1/img?w=${w}&u=${encodeURIComponent(url)}` : null;

export const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export const videoIdOf = (it: NewsItem) =>
  (it.extra.videoId as string | undefined) ?? new URL(it.url).searchParams.get('v') ?? '';

export const NEWS_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'ia', label: 'IA' },
  { id: 'tech', label: 'Tech' },
  { id: 'apple', label: 'Apple' },
  { id: 'google', label: 'Google' },
  { id: 'samsung', label: 'Samsung' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'dev', label: 'Dev' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'afrique', label: 'Afrique' },
];

/** Logo à afficher pour un dépôt du radar des versions. */
export const RELEASE_LOGO: Record<string, string> = {
  'facebook/react': 'React',
  'vercel/next.js': 'Next.js',
  'nodejs/node': 'Node.js',
  'microsoft/TypeScript': 'TypeScript',
  'vitejs/vite': 'Vite',
  'tailwindlabs/tailwindcss': 'Tailwind',
  'vuejs/core': 'Vue',
  'flutter/flutter': 'Flutter',
  'JetBrains/kotlin': 'Kotlin',
  'laravel/framework': 'Laravel',
  'django/django': 'Django',
  'fastapi/fastapi': 'FastAPI',
  'prisma/prisma': 'Prisma',
  'supabase/supabase': 'Supabase',
  'docker/compose': 'Docker',
  'kubernetes/kubernetes': 'Kubernetes',
  'rust-lang/rust': 'Rust',
  'anthropics/claude-code': 'Claude',
};
