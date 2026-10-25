import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { CollectedNews, LangFilter, NewsItem, NewsQuery } from '../domain/news-item';
import type { IngestRunSummary, NewsRepository } from '../domain/ports';

interface Row {
  id: string;
  kind: NewsItem['kind'];
  source: string;
  source_name: string;
  category: string;
  lang: 'fr' | 'en';
  title: string;
  summary: string;
  url: string;
  image: string | null;
  author: string | null;
  published_at: Date;
  score: number;
  comments: number;
  extra: Record<string, unknown>;
}

const toItem = (r: Row): NewsItem => ({
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
  publishedAt: r.published_at.toISOString(),
  score: Number(r.score),
  comments: Number(r.comments),
  extra: r.extra,
});

/** Contenus commerciaux sans intérêt pour des devs (promos, « bons plans »). */
const NOT_NOISE = Prisma.sql`title !~* '(\\mdeals?\\M|prime day|black friday|% off|\\mcoupon|bon plan|bons plans|soldes|promo |code promo|meilleures offres|best .* deals)'`;

const langIs = (lang?: LangFilter) =>
  lang === 'fr' || lang === 'en' ? Prisma.sql`AND lang = ${lang}::"Lang"` : Prisma.empty;

export const newsId = (url: string) => createHash('sha1').update(url).digest('hex').slice(0, 24);

@Injectable()
export class PrismaNewsRepository implements NewsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async upsert(rows: CollectedNews[]): Promise<number> {
    for (const r of rows) {
      const data = {
        title: r.title.slice(0, 400),
        summary: r.summary,
        score: r.score ?? 0,
        comments: r.comments ?? 0,
        extra: (r.extra ?? {}) as Prisma.InputJsonObject,
        fetchedAt: new Date(),
      };
      await this.prisma.newsItem.upsert({
        where: { url: r.url },
        create: {
          ...data,
          id: newsId(r.url),
          kind: r.kind,
          source: r.source,
          sourceName: r.sourceName,
          category: r.category,
          lang: r.lang,
          url: r.url,
          image: r.image,
          author: r.author,
          publishedAt: r.publishedAt,
        },
        update: r.image ? { ...data, image: r.image } : data,
      });
    }
    return rows.length;
  }

  async startRun(): Promise<number> {
    return (await this.prisma.newsIngestRun.create({ data: {} })).id;
  }

  async finishRun(
    id: number,
    result: { items: number; sourcesOk: number; errors: { source: string; error: string }[] },
  ): Promise<void> {
    await this.prisma.newsIngestRun.update({
      where: { id },
      data: { finishedAt: new Date(), ...result },
    });
  }

  missingImages(limit: number): Promise<{ id: string; url: string }[]> {
    return this.prisma.$queryRaw`
      SELECT id, url FROM news_items
      WHERE image IS NULL AND kind = 'article' AND (extra->>'ogTried') IS NULL
      ORDER BY published_at DESC LIMIT ${limit}`;
  }

  async setImage(id: string, image: string | null): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE news_items SET image = ${image}, extra = extra || '{"ogTried":true}'::jsonb
      WHERE id = ${id}`;
  }

  async purgeOlderThan(days: number): Promise<void> {
    // Les versions restent (le radar affiche la dernière de chaque projet), le catalogue Microsoft aussi
    // (sa date est celle de la dernière modification d'une certification, pas une date de publication).
    await this.prisma.$executeRaw`
      DELETE FROM news_items
      WHERE kind <> 'release' AND source <> 'microsoft-learn' AND published_at < now() - make_interval(days => ${days}::int)`;
  }

  async list(q: NewsQuery): Promise<NewsItem[]> {
    const where = [NOT_NOISE];
    if (q.category) where.push(Prisma.sql`category = ${q.category}`);
    // Emplois et certifications ont leurs écrans : ils n'entrent pas dans le fil sans filtre `kind`.
    if (q.kind) where.push(Prisma.sql`kind = ${q.kind}::"NewsKind"`);
    else where.push(Prisma.sql`kind NOT IN ('job', 'cert')`);
    if (q.q) where.push(Prisma.sql`(title ILIKE ${`%${q.q}%`} OR summary ILIKE ${`%${q.q}%`})`);
    if (q.before) where.push(Prisma.sql`published_at < ${new Date(q.before)}`);
    const limit = Math.min(100, Math.max(1, q.limit ?? 30));
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT * FROM news_items WHERE ${Prisma.join(where, ' AND ')} ${langIs(q.lang)}
      ORDER BY published_at DESC LIMIT ${limit}`;
    return rows.map(toItem);
  }

  async latest(
    f: {
      kind: NewsItem['kind'];
      category?: string;
      withImage?: boolean;
      freshHours?: number;
      categories?: string[];
    },
    limit: number,
    lang?: LangFilter,
  ): Promise<NewsItem[]> {
    const where = [NOT_NOISE, Prisma.sql`kind = ${f.kind}::"NewsKind"`];
    if (f.category) where.push(Prisma.sql`category = ${f.category}`);
    if (f.categories) where.push(Prisma.sql`category IN (${Prisma.join(f.categories)})`);
    if (f.withImage) where.push(Prisma.sql`image IS NOT NULL`);
    if (f.freshHours)
      where.push(Prisma.sql`published_at > now() - make_interval(hours => ${f.freshHours}::int)`);
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT * FROM news_items WHERE ${Prisma.join(where, ' AND ')} ${langIs(lang)}
      ORDER BY published_at DESC LIMIT ${limit}`;
    return rows.map(toItem);
  }

  async top(
    kind: NewsItem['kind'],
    since: { column: 'fetched_at' | 'published_at'; hours: number },
    limit: number,
  ): Promise<NewsItem[]> {
    const column = Prisma.raw(since.column === 'fetched_at' ? 'fetched_at' : 'published_at');
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT * FROM news_items
      WHERE kind = ${kind}::"NewsKind" AND ${column} > now() - make_interval(hours => ${since.hours}::int)
      ORDER BY score DESC LIMIT ${limit}`;
    return rows.map(toItem);
  }

  async countBySource(): Promise<Map<string, { n: number; last: string }>> {
    const rows = await this.prisma.$queryRaw<{ source: string; n: number; last: Date }[]>`
      SELECT source, count(*)::int AS n, max(published_at) AS last FROM news_items GROUP BY source`;
    return new Map(rows.map((r) => [r.source, { n: r.n, last: r.last.toISOString() }]));
  }

  count(): Promise<number> {
    return this.prisma.newsItem.count();
  }

  async lastRun(): Promise<IngestRunSummary | null> {
    const run = await this.prisma.newsIngestRun.findFirst({
      where: { finishedAt: { not: null } },
      orderBy: { id: 'desc' },
    });
    return run
      ? { finishedAt: run.finishedAt!.toISOString(), items: run.items, sourcesOk: run.sourcesOk }
      : null;
  }
}
