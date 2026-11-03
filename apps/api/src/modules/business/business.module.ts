import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { BusinessController } from './http/business.controller';
import { BusinessSessionGuard } from './http/business-session.guard';
import { CareersController } from './http/careers.controller';
import { BusinessRepository } from './infrastructure/business.repository';
import { BusinessSessionStore } from './infrastructure/business-session.store';

// Portail entreprise (apps/business) et candidatures des devs aux offres des entreprises inscrites.
@Module({
  imports: [IdentityModule],
  controllers: [BusinessController, CareersController],
  providers: [BusinessRepository, BusinessSessionStore, BusinessSessionGuard],
})
export class BusinessModule {}
