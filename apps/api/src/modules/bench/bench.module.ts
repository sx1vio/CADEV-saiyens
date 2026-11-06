import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { NotificationsModule } from '../notifications';
import { ReputationModule } from '../reputation';
import { BenchService } from './infrastructure/bench.service';
import { BENCH_HOST_RESOLVER, dnsResolver } from './infrastructure/host-resolver';
import { BenchController } from './http/bench.controller';

// Banc d'essai : tests entre devs sur de vrais appareils et réseaux, payés en Proof XP.
@Module({
  imports: [IdentityModule, ReputationModule, NotificationsModule],
  controllers: [BenchController],
  providers: [BenchService, { provide: BENCH_HOST_RESOLVER, useValue: dnsResolver }],
})
export class BenchModule {}
