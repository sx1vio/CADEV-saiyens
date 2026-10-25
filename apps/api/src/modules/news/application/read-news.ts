import { diverse } from '../domain/diversity';
import type { LangFilter, NewsItem, NewsQuery } from '../domain/news-item';
import type { NewsRepository } from '../domain/ports';
import {
  CATEGORY_LABEL,
  CERT_FEEDS,
  CHANNELS,
  FEEDS,
  JOB_BOARDS,
  type Category,
} from '../domain/sources';

const HOME_CATEGORIES: Category[] = [
  'ia',
  'tech',
  'apple',
  'google',
  'samsung',
  'mobile',
  'dev',
  'cloud',
  'afrique',
];
const HERO_CATEGORIES: Category[] = ['ia', 'tech', 'apple', 'google', 'samsung', 'dev'];

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
}

export interface SourceInfo {
  id: string;
  name: string;
  kind: 'rss' | 'youtube' | 'api';
  category: string;
  lang: 'fr' | 'en';
  homepage: string;
  items: number;
  last: string | null;
}

/** Lectures pour le front : accueil structuré en un appel, sources, état de la collecte. */
export class ReadNews {
  constructor(private readonly repo: NewsRepository) {}

  async home(lang?: LangFilter): Promise<HomeNews> {
    const sections: Record<string, NewsItem[]> = {};
    for (const category of HOME_CATEGORIES) {
      const items = await this.repo.latest({ kind: 'article', category }, 60, lang);
      // Les articles illustrés d'abord, puis les autres, en gardant l'ordre chronologique
      sections[category] = diverse(
        [...items.filter((i) => i.image), ...items.filter((i) => !i.image)],
        8,
        3,
      );
    }
    const fresh = await this.repo.latest(
      { kind: 'article', withImage: true, freshHours: 36, categories: HERO_CATEGORIES },
      80,
      lang,
    );
    const [videos, hn, devto, repos, releases, run] = await Promise.all([
      this.repo.latest({ kind: 'video' }, 80, lang),
      this.repo.top('hn', { column: 'fetched_at', hours: 6 }, 15),
      this.repo.top('devto', { column: 'published_at', hours: 240 }, 10),
      this.repo.top('repo', { column: 'fetched_at', hours: 72 }, 12),
      this.repo.latest({ kind: 'release' }, 18),
      this.repo.lastRun(),
    ]);
    return {
      hero: diverse(fresh, 5, 1),
      sections,
      sectionLabels: CATEGORY_LABEL,
      videos: diverse(videos, 16, 2),
      hn,
      devto,
      repos,
      releases,
      updatedAt: run?.finishedAt ?? null,
      sources: FEEDS.length + CHANNELS.length + 13 + JOB_BOARDS.length + CERT_FEEDS.length,
    };
  }

  list(query: NewsQuery): Promise<NewsItem[]> {
    return this.repo.list(query);
  }

  async sources(): Promise<SourceInfo[]> {
    const by = await this.repo.countBySource();
    const stat = (id: string) => ({ items: by.get(id)?.n ?? 0, last: by.get(id)?.last ?? null });
    const api = (id: string, name: string, homepage: string): SourceInfo => ({
      id,
      name,
      kind: 'api',
      category: 'dev',
      lang: 'en',
      homepage,
      ...stat(id),
    });
    return [
      ...FEEDS.map((f): SourceInfo => ({
        id: f.id,
        name: f.name,
        kind: 'rss',
        category: f.category,
        lang: f.lang,
        homepage: f.homepage,
        ...stat(f.id),
      })),
      ...CHANNELS.map((c): SourceInfo => ({
        id: `yt:${c.id}`,
        name: c.name,
        kind: 'youtube',
        category: c.category,
        lang: c.lang,
        homepage: `https://www.youtube.com/channel/${c.channelId}`,
        ...stat(c.id),
      })),
      api('hackernews', 'Hacker News', 'https://news.ycombinator.com'),
      api('devto', 'DEV Community', 'https://dev.to'),
      api('github-trending', 'GitHub · dépôts de la semaine', 'https://github.com'),
      api('github-releases', 'GitHub · nouvelles versions', 'https://github.com'),
      api('remotive', 'Remotive · emplois', 'https://remotive.com'),
      api('jobicy', 'Jobicy · emplois', 'https://jobicy.com'),
      api('himalayas', 'Himalayas · emplois', 'https://himalayas.app'),
      api('myjobmag', 'MyJobMag · emplois Nigeria', 'https://www.myjobmag.com'),
      ...JOB_BOARDS.map((b) =>
        api(
          `jobs:${b.id}`,
          `${b.name} · carrières`,
          `https://${b.ats === 'ashby' ? 'jobs.ashbyhq.com' : 'boards.greenhouse.io'}/${b.slug}`,
        ),
      ),
      api('skills:anthropics/skills', 'Anthropic · skills', 'https://github.com/anthropics/skills'),
      api('skills:openai/skills', 'OpenAI · skills Codex', 'https://github.com/openai/skills'),
      api(
        'claude-plugins-official',
        'Plugins Claude Code',
        'https://github.com/anthropics/claude-plugins-official',
      ),
      api('mcp-registry', 'Registre MCP officiel', 'https://registry.modelcontextprotocol.io'),
      api(
        'microsoft-learn',
        'Microsoft Learn · certifications',
        'https://learn.microsoft.com/credentials/',
      ),
      ...CERT_FEEDS.map((f) => api(f.id, f.name, f.homepage)),
    ];
  }

  async status(): Promise<{
    newsItems: number;
    lastIngest: Awaited<ReturnType<NewsRepository['lastRun']>>;
  }> {
    const [newsItems, lastIngest] = await Promise.all([this.repo.count(), this.repo.lastRun()]);
    return { newsItems, lastIngest };
  }
}
