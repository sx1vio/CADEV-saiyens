import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { NotificationsModule, Notifier } from '../notifications';
import { ClaimQuestion, RunWave } from './application/run-wave';
import { ClaimController } from './http/claim.controller';
import { MatchingActions } from './http/matching.actions';
import { PrismaMatchingStore } from './infrastructure/prisma-matching.store';
import { MatchingJobs } from './jobs/matching.jobs';

// Module matching (propriétaire : Florent) : S3, S11, X4. Sélection des aidants, escalade à
// 15 minutes, « Je m'en occupe ». Règles pures dans @devhub/core (scoring/matching.ts).
@Module({
  imports: [IdentityModule, NotificationsModule],
  controllers: [ClaimController],
  providers: [
    PrismaMatchingStore,
    MatchingJobs,
    MatchingActions,
    {
      provide: RunWave,
      inject: [PrismaMatchingStore, Notifier],
      useFactory: (store: PrismaMatchingStore, notifier: Notifier) => new RunWave(store, notifier),
    },
    {
      provide: ClaimQuestion,
      inject: [PrismaMatchingStore],
      useFactory: (store: PrismaMatchingStore) => new ClaimQuestion(store),
    },
  ],
  exports: [PrismaMatchingStore],
})
export class MatchingModule {}
