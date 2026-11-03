import { Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { AesGcmTokenCipher, IdentityModule, ScryptPasswordHasher } from '../identity';
import { AdminAuth } from './infrastructure/admin-auth';
import { AdminAuthController } from './http/admin-auth.controller';
import { AdminController } from './http/admin.controller';
import { AdminPlatformController } from './http/admin-platform.controller';
import { AnnouncementsController } from './http/announcements.controller';
import { AdminSessionGuard } from './http/admin-session.guard';
import { JobsController } from './http/jobs.controller';
import { AdminSessionStore } from './infrastructure/admin-session.store';
import { JobOffersRepository } from './infrastructure/job-offers.repository';

// Espace d'administration (apps/admin) : session séparée à double facteur, offres d'emploi,
// tableau de bord. Les comptes administrateurs se créent uniquement par la CLI (cli.ts).
@Module({
  imports: [IdentityModule],
  controllers: [
    AdminAuthController,
    AdminController,
    AdminPlatformController,
    AnnouncementsController,
    JobsController,
  ],
  providers: [
    AdminSessionStore,
    AdminSessionGuard,
    AdminAuth,
    JobOffersRepository,
    ScryptPasswordHasher,
    {
      provide: AesGcmTokenCipher,
      inject: [ENV],
      useFactory: (env: Env) => new AesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY),
    },
  ],
  exports: [AdminSessionGuard, AdminSessionStore],
})
export class BackofficeModule {}
