import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from './infrastructure/config/config.module';
import { ActionsModule } from './infrastructure/actions/action-registry';
import { IdempotencyModule } from './infrastructure/idempotency/idempotency.module';
import { JobsModule } from './infrastructure/jobs/jobs.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AiModule } from './modules/ai';
import { MatchingModule } from './modules/matching';
import { NewsJobsModule } from './modules/news';
import { RoomsModule } from './modules/rooms';
import { PassportModule } from './modules/passport';

// Process worker : même code que l'API, sans HTTP (PROCESS_ROLE=worker). Chaque module
// enregistre ses handlers de jobs au démarrage (catalogue : infrastructure/jobs/catalog.ts).
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JobsModule,
    IdempotencyModule,
    ActionsModule,
    PassportModule,
    AiModule,
    MatchingModule,
    NewsJobsModule,
    RoomsModule,
  ],
})
class WorkerModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('prêt');
}

void bootstrap();
