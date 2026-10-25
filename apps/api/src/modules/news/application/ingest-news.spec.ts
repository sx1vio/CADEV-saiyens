import { describe, expect, it, vi } from 'vitest';
import type { CollectedNews } from '../domain/news-item';
import type { NewsCollectors, NewsRepository } from '../domain/ports';
import { IngestNews } from './ingest-news';

const row = (url: string): CollectedNews => ({
  kind: 'article',
  source: 's',
  sourceName: 'S',
  category: 'tech',
  lang: 'en',
  title: url,
  summary: '',
  url,
  image: null,
  author: null,
  publishedAt: new Date(),
});

function fakes() {
  const repo = {
    upsert: vi.fn(async (rows: CollectedNews[]) => rows.length),
    startRun: vi.fn(async () => 7),
    finishRun: vi.fn(async () => undefined),
    missingImages: vi.fn(async () => [{ id: 'x', url: 'https://a.b/x' }]),
    setImage: vi.fn(async () => undefined),
    purgeOlderThan: vi.fn(async () => undefined),
  };
  const collectors: NewsCollectors = {
    feeds: () => [
      { source: 'ok', run: async () => [row('https://a.b/1'), row('https://a.b/2')] },
      { source: 'ko', run: async () => Promise.reject(new Error('HTTP 503')) },
    ],
    github: () => [{ source: 'gh', run: async () => [row('https://github.com/a/b')] }],
    jobs: () => [{ source: 'jb', run: async () => [{ ...row('https://a.b/job'), kind: 'job' }] }],
    certs: () => [],
    ogImage: async () => 'https://a.b/og.png',
  };
  return {
    repo,
    collectors,
    ingest: new IngestNews(repo as unknown as NewsRepository, collectors),
  };
}

describe('IngestNews', () => {
  it('enregistre les sources qui répondent et journalise celles en échec', async () => {
    const { repo, ingest } = fakes();
    const r = await ingest.execute({ group: 'feeds' });
    expect(r).toMatchObject({
      sourcesOk: 1,
      items: 2,
      failed: [{ source: 'ko', error: 'HTTP 503' }],
    });
    expect(repo.finishRun).toHaveBeenCalledWith(7, {
      items: 2,
      sourcesOk: 1,
      errors: [{ source: 'ko', error: 'HTTP 503' }],
    });
    expect(repo.setImage).toHaveBeenCalledWith('x', 'https://a.b/og.png');
    expect(repo.purgeOlderThan).toHaveBeenCalledWith(45);
  });

  it('la passe GitHub ne touche ni aux images ni à la purge', async () => {
    const { repo, ingest } = fakes();
    expect((await ingest.execute({ group: 'github' })).items).toBe(1);
    expect(repo.missingImages).not.toHaveBeenCalled();
    expect(repo.purgeOlderThan).not.toHaveBeenCalled();
  });

  it('la passe emplois enregistre les offres sans purge ni images', async () => {
    const { repo, ingest } = fakes();
    expect(await ingest.execute({ group: 'jobs' })).toMatchObject({ sourcesOk: 1, items: 1 });
    expect(repo.upsert).toHaveBeenCalledWith([expect.objectContaining({ kind: 'job' })]);
    expect(repo.purgeOlderThan).not.toHaveBeenCalled();
  });
});
