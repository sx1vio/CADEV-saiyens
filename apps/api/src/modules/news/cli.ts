import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '../../infrastructure/config/config.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { IngestNews } from './application/ingest-news';
import { NewsIngestModule } from './news.module';

// Collecte à la main, sans worker : pnpm --filter @devhub/api news:ingest
@Module({ imports: [ConfigModule, PrismaModule, NewsIngestModule] })
class NewsCliModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(NewsCliModule, { logger: ['error'] });
  const ingest = app.get(IngestNews);
  for (const group of ['feeds', 'github', 'jobs', 'certs'] as const) {
    const r = await ingest.execute({ group });
    console.log(
      `[news] ${group} : ${r.sourcesOk} sources OK, ${r.failed.length} en échec, ${r.items} éléments, ${r.seconds} s`,
    );
    for (const f of r.failed) console.log(`  - ${f.source} : ${f.error}`);
  }
  await app.close();
}

void main();
