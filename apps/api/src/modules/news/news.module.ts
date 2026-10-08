import { Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { IngestNews } from './application/ingest-news';
import { ReadNews } from './application/read-news';
import { NewsController } from './http/news.controller';
import { HttpNewsCollectors } from './infrastructure/http-collectors';
import { ImageProxy } from './infrastructure/image-proxy';
import { PrismaNewsRepository } from './infrastructure/prisma-news.repository';

/** Lecture des actualités (API HTTP). */
@Module({
  controllers: [NewsController],
  providers: [
    PrismaNewsRepository,
    {
      provide: ReadNews,
      inject: [PrismaNewsRepository],
      useFactory: (repo: PrismaNewsRepository) => new ReadNews(repo),
    },
    {
      provide: ImageProxy,
      inject: [ENV],
      useFactory: (env: Env) => new ImageProxy(env.NEWS_IMAGE_CACHE_DIR),
    },
  ],
})
export class NewsModule {}

/** Collecte des actualités (worker et commande news:ingest). */
@Module({
  providers: [
    PrismaNewsRepository,
    {
      provide: IngestNews,
      inject: [PrismaNewsRepository],
      useFactory: (repo: PrismaNewsRepository) => new IngestNews(repo, new HttpNewsCollectors()),
    },
  ],
  exports: [IngestNews],
})
export class NewsIngestModule {}
