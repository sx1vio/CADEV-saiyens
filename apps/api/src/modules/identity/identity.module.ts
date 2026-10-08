import { Logger, Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { SignInWithGithub } from './application/sign-in-with-github';
import type { SignUpListener } from './domain/ports';
import { AesGcmTokenCipher } from './infrastructure/aes-gcm-token-cipher';
import { FakeGithubOAuthProvider } from './infrastructure/fake-oauth.provider';
import { GithubOAuthHttpProvider } from './infrastructure/github-oauth.provider';
import { PrismaIdentityRepository } from './infrastructure/prisma-identity.repository';
import { PrismaSessionStore } from './infrastructure/prisma-session.store';
import { AuthController, GITHUB_OAUTH_PROVIDER } from './http/auth.controller';
import { MeController } from './http/me.controller';
import { SessionGuard } from './http/session.guard';

// Pour l'instant, une inscription est seulement journalisée. L'import du profil GitHub
// (dépôts, langages, score G) s'y branchera avec PR1 (#17) et X3 (#52).
const logSignUps: SignUpListener = {
  userSignedUp: async (userId) =>
    new Logger('IdentityModule').log({ userId }, 'Nouvelle inscription'),
};

@Module({
  controllers: [AuthController, MeController],
  providers: [
    PrismaIdentityRepository,
    PrismaSessionStore,
    SessionGuard,
    {
      provide: GITHUB_OAUTH_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.AUTH_FAKE_PROVIDER
          ? new FakeGithubOAuthProvider()
          : new GithubOAuthHttpProvider(env.GITHUB_CLIENT_ID!, env.GITHUB_CLIENT_SECRET!),
    },
    {
      provide: SignInWithGithub,
      inject: [ENV, PrismaIdentityRepository, PrismaSessionStore],
      useFactory: (env: Env, accounts: PrismaIdentityRepository, sessions: PrismaSessionStore) =>
        new SignInWithGithub(
          accounts,
          sessions,
          new AesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY),
          { now: () => new Date() },
          logSignUps,
        ),
    },
  ],
  exports: [SessionGuard, PrismaSessionStore],
})
export class IdentityModule {}
