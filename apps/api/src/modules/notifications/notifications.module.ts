import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { Notifier } from './infrastructure/notifier';
import { EventsController } from './http/events.controller';
import { NotificationsController } from './http/notifications.controller';
import { UnsubscribeController } from './http/unsubscribe.controller';
import { MAILER, SmtpMailer } from './infrastructure/mailer';
import { EmailDigestJob } from './jobs/email-digest.job';

// Module notifications : notifications dans l'application (S3, S4, R3), e-mail récapitulatif
// (Y3). Propriétaire : Florent.
// Les autres modules appellent Notifier dans leur propre transaction.
@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController, EventsController, UnsubscribeController],
  providers: [Notifier, EmailDigestJob, { provide: MAILER, useClass: SmtpMailer }],
  exports: [Notifier],
})
export class NotificationsModule {}
