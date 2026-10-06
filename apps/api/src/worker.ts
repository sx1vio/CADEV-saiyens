import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { PgBoss } from 'pg-boss';
import { ConfigModule } from './infrastructure/config/config.module';
import { JOB_QUEUE, JobsModule } from './infrastructure/jobs/jobs.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';

// Process worker : même code que l'API, sans HTTP. Il consomme les jobs pg-boss
// (catalogue : docs/architecture/07-taches-fond-temps-reel.md).
@Module({ imports: [ConfigModule, PrismaModule, JobsModule] })
class WorkerModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  const boss = app.get<PgBoss>(JOB_QUEUE);
  boss.on('error', (error) => console.error('[worker] pg-boss', error));
  await boss.start();
  // Les handlers des modules métier s'enregistreront ici (boss.work(...)).
  console.log('[worker] prêt');
}

void bootstrap();
