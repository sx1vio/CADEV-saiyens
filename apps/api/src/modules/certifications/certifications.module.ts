import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { CertificationsService } from './infrastructure/certifications.service';
import { CertificationsController } from './http/certifications.controller';

// Certifications DevHub : banque de questions côté serveur, examens chronométrés corrigés par
// le serveur, certificats avec un code de vérification public.
@Module({
  imports: [IdentityModule],
  controllers: [CertificationsController],
  providers: [CertificationsService],
})
export class CertificationsModule {}
