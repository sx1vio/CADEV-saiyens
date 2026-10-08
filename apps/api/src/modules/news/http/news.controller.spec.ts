import type { INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ProblemDetailsFilter } from '../../../infrastructure/http/problem-details.filter';
import { ReadNews } from '../application/read-news';
import { ImageProxy } from '../infrastructure/image-proxy';
import { NewsController } from './news.controller';

describe('routes des actualités', () => {
  let app: INestApplication;
  const read = {
    home: vi.fn(async () => ({ hero: [], sections: {} })),
    list: vi.fn(async () => []),
    sources: vi.fn(async () => []),
    status: vi.fn(async () => ({ newsItems: 3, lastIngest: null })),
  };
  const images = { get: vi.fn(async () => Buffer.from('webp')) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NewsController],
      providers: [
        { provide: ReadNews, useValue: read },
        { provide: ImageProxy, useValue: images },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/news/home est public et mis en cache', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/news/home?lang=fr').expect(200);
    expect(read.home).toHaveBeenCalledWith('fr');
    expect(res.headers['cache-control']).toContain('max-age=120');
  });

  it('GET /api/v1/videos force le type vidéo', async () => {
    await request(app.getHttpServer()).get('/api/v1/videos?category=ia&limit=12').expect(200);
    expect(read.list).toHaveBeenCalledWith({ category: 'ia', limit: 12, kind: 'video' });
  });

  it('refuse des paramètres invalides au format problem+json', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/news?limit=500').expect(400);
    expect(res.body.code).toBe('validation.failed');
  });

  it('GET /api/v1/img renvoie du WebP, ou 502 si la source est refusée', async () => {
    const ok = await request(app.getHttpServer())
      .get('/api/v1/img')
      .query({ u: 'https://example.com/a.jpg', w: 320 })
      .expect(200);
    expect(ok.headers['content-type']).toBe('image/webp');

    images.get.mockRejectedValueOnce(new Error('adresse refusée'));
    const ko = await request(app.getHttpServer())
      .get('/api/v1/img')
      .query({ u: 'http://127.0.0.1/a.jpg' })
      .expect(502);
    expect(ko.body.code).toBe('image.unavailable');
  });

  it('GET /api/v1/news/status donne le volume indexé', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/news/status').expect(200);
    expect(res.body).toEqual({ newsItems: 3, lastIngest: null });
  });
});
