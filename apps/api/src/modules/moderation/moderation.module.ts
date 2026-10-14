import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { AwardXp, ReputationModule } from '../reputation';
import { Moderation } from './application/moderation';
import { AdminGuard } from './http/admin.guard';
import { ModerationController } from './http/moderation.controller';
import { ReportReader } from './infrastructure/report.reader';

// Module moderation (propriétaire : Emmanuel) : signalements, retrait par un admin (M1), audit (M4).
@Module({
  imports: [IdentityModule, ReputationModule],
  controllers: [ModerationController],
  providers: [
    ReportReader,
    AdminGuard,
    { provide: Moderation, inject: [AwardXp], useFactory: (xp: AwardXp) => new Moderation(xp) },
  ],
})
export class ModerationModule {}
