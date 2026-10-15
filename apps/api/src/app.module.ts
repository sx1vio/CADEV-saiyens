import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { ConfigModule, ENV } from './infrastructure/config/config.module';
import type { Env } from './infrastructure/config/env';
import { HealthController } from './infrastructure/http/health.controller';
import { ProblemDetailsFilter } from './infrastructure/http/problem-details.filter';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ActionsModule } from './infrastructure/actions/action-registry';
import { IdempotencyModule } from './infrastructure/idempotency/idempotency.module';
import { JobsModule } from './infrastructure/jobs/jobs.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';
import { IdentityModule, OriginGuard } from './modules/identity';
import { PassportModule } from './modules/passport';
import { AiModule } from './modules/ai';
import { DiscoveryModule } from './modules/discovery';
import { ModerationModule } from './modules/moderation';
import { PlatformModule } from './modules/platform';
import { ShareModule } from './modules/share';
import { MatchingModule } from './modules/matching';
import { NewsModule } from './modules/news';
import { NotificationsModule } from './modules/notifications';
import { RoomsModule } from './modules/rooms';
import { SosModule } from './modules/sos';
import { SyncModule } from './modules/sync';
import { ReputationModule } from './modules/reputation';

// Les modules métier (identity, sos, rooms…) s'ajoutent ici : docs/architecture/02-backend.md
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          // Identifiant de requête renvoyé dans les erreurs et l'en-tête X-Request-Id
          genReqId: (req, res) => {
            const id = req.headers['x-request-id'] ?? `req_${crypto.randomUUID()}`;
            res.setHeader('X-Request-Id', id);
            return id;
          },
          redact: ['req.headers.cookie', 'req.headers.authorization'],
          transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
        },
      }),
    }),
    PrismaModule,
    JobsModule,
    IdempotencyModule,
    ActionsModule,
    RealtimeModule,
    IdentityModule,
    PassportModule,
    ReputationModule,
    AiModule,
    SosModule,
    NotificationsModule,
    MatchingModule,
    SyncModule,
    RoomsModule,
    DiscoveryModule,
    NewsModule,
    PlatformModule,
    ModerationModule,
    ShareModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_GUARD, useClass: OriginGuard },
  ],
})
export class AppModule {}
