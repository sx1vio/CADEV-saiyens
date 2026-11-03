import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { MessagesController } from './http/messages.controller';
import { MessagingRepository } from './infrastructure/messaging.repository';

// Messagerie privée entre membres (contacter un dev, discuter en temps réel).
@Module({
  imports: [IdentityModule],
  controllers: [MessagesController],
  providers: [MessagingRepository],
  exports: [MessagingRepository],
})
export class MessagingModule {}
