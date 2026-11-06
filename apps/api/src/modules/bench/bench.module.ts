import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { NotificationsModule } from '../notifications';
import { ReputationModule } from '../reputation';
import { BenchService } from './infrastructure/bench.service';
import { BenchController } from './http/bench.controller';

// Banc d'essai : tests entre devs sur de vrais appareils et réseaux, payés en Proof XP.
@Module({
  imports: [IdentityModule, ReputationModule, NotificationsModule],
  controllers: [BenchController],
  providers: [BenchService],
})
export class BenchModule {}
