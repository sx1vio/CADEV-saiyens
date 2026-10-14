import { Global, Module } from '@nestjs/common';
import { RealtimeHub } from './realtime.hub';

// Temps réel (Y8, ADR-0007) : écoute LISTEN/NOTIFY et registre des connexions SSE. Le flux
// lui-même (GET /api/v1/events) est servi par le module notifications.
@Global()
@Module({
  providers: [RealtimeHub],
  exports: [RealtimeHub],
})
export class RealtimeModule {}
