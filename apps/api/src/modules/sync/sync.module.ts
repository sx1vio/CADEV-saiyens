import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { SyncController } from './http/sync.controller';
import { SyncBatch } from './infrastructure/sync-batch';

// Module sync (propriétaire : Florent) : POST /sync, file d'actions hors ligne (O2, ADR-0008).
// Les actions sont fournies par les autres modules via ActionRegistry.
@Module({
  imports: [IdentityModule],
  controllers: [SyncController],
  providers: [SyncBatch],
})
export class SyncModule {}
