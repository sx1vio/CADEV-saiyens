import type { Category } from './sources';

export type NewsKind = 'article' | 'video' | 'hn' | 'devto' | 'repo' | 'release' | 'job' | 'cert';

/** Élément collecté chez une source, avant enregistrement. */
export interface CollectedNews {
  kind: NewsKind;
  source: string;
  sourceName: string;
  category: Category;
  lang: 'fr' | 'en';
  title: string;
  summary: string;
  url: string;
  image: string | null;
  author: string | null;
  publishedAt: Date;
  score?: number;
  comments?: number;
  extra?: Record<string, unknown>;
}

/** Élément tel que le front le reçoit (apps/web/src/platform/news.ts). */
export interface NewsItem {
  id: string;
  kind: NewsKind;
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

export type LangFilter = 'fr' | 'en' | 'all';

export interface NewsQuery {
  category?: string;
  kind?: NewsKind;
  lang?: LangFilter;
  q?: string;
  before?: string;
  limit?: number;
}
