import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { Notifier } from './infrastructure/notifier';
import { EventsController } from './http/events.controller';
import { NotificationsController } from './http/notifications.controller';

// Module notifications : notifications dans l'application (S3, S4, R3). Propriétaire : Florent.
// Les autres modules appellent Notifier dans leur propre transaction.
@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController, EventsController],
  providers: [Notifier],
  exports: [Notifier],
})
export class NotificationsModule {}
