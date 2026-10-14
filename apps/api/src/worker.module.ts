import { Module } from '@nestjs/common';
import { ConfigModule } from './infrastructure/config/config.module';
import { ActionsModule } from './infrastructure/actions/action-registry';
import { IdempotencyModule } from './infrastructure/idempotency/idempotency.module';
import { JobsModule } from './infrastructure/jobs/jobs.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';
import { AiModule } from './modules/ai';
import { MatchingModule } from './modules/matching';
import { NewsJobsModule } from './modules/news';
import { RoomsModule } from './modules/rooms';
import { PassportModule } from './modules/passport';
import { PlatformModule } from './modules/platform';

// Process worker : même code que l'API, sans HTTP (PROCESS_ROLE=worker). Chaque module
// enregistre ses handlers de jobs au démarrage (catalogue : infrastructure/jobs/catalog.ts).
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JobsModule,
    // Fournit RealtimeHub, injecté par les contrôleurs des modules importés (BUG-025). Le hub
    // n'ouvre pas de connexion LISTEN hors du process http.
    RealtimeModule,
    IdempotencyModule,
    ActionsModule,
    PassportModule,
    AiModule,
    MatchingModule,
    NewsJobsModule,
    RoomsModule,
    PlatformModule,
  ],
})
export class WorkerModule {}
