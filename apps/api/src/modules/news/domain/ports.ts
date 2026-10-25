import type { CollectedNews, LangFilter, NewsItem, NewsQuery } from './news-item';

export interface IngestRunSummary {
  finishedAt: string | null;
  items: number;
  sourcesOk: number;
}

export interface NewsRepository {
  /** Insère ou met à jour par lien (compteurs, résumé ; l'image existante est gardée si la nouvelle manque). */
  upsert(rows: CollectedNews[]): Promise<number>;
  startRun(): Promise<number>;
  finishRun(
    id: number,
    result: { items: number; sourcesOk: number; errors: { source: string; error: string }[] },
  ): Promise<void>;
  /** Articles sans image dont la balise Open Graph n'a pas encore été essayée. */
  missingImages(limit: number): Promise<{ id: string; url: string }[]>;
  setImage(id: string, image: string | null): Promise<void>;
  purgeOlderThan(days: number): Promise<void>;

  list(query: NewsQuery): Promise<NewsItem[]>;
  latest(
    filter: {
      kind: NewsItem['kind'];
      category?: string;
      withImage?: boolean;
      freshHours?: number;
      categories?: string[];
    },
    limit: number,
    lang?: LangFilter,
  ): Promise<NewsItem[]>;
  top(
    kind: NewsItem['kind'],
    since: { column: 'fetched_at' | 'published_at'; hours: number },
    limit: number,
  ): Promise<NewsItem[]>;
  countBySource(): Promise<Map<string, { n: number; last: string }>>;
  count(): Promise<number>;
  lastRun(): Promise<IngestRunSummary | null>;
}

export interface NewsCollectors {
  feeds(): { source: string; run: () => Promise<CollectedNews[]> }[];
  github(): { source: string; run: () => Promise<CollectedNews[]> }[];
  jobs(): { source: string; run: () => Promise<CollectedNews[]> }[];
  certs(): { source: string; run: () => Promise<CollectedNews[]> }[];
  ogImage(url: string): Promise<string | null>;
}
