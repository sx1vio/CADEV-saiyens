import { Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { SignInWithGithub } from './application/sign-in-with-github';
import { AesGcmTokenCipher } from './infrastructure/aes-gcm-token-cipher';
import { EnqueueProfileImport } from './infrastructure/enqueue-profile-import.listener';
import { GithubTokenReader } from './infrastructure/github-token.reader';
import { FakeGithubOAuthProvider } from './infrastructure/fake-oauth.provider';
import { GithubOAuthHttpProvider } from './infrastructure/github-oauth.provider';
import { PrismaIdentityRepository } from './infrastructure/prisma-identity.repository';
import { PrismaSessionStore } from './infrastructure/prisma-session.store';
import { AuthController, GITHUB_OAUTH_PROVIDER } from './http/auth.controller';
import { MeController } from './http/me.controller';
import { SessionGuard } from './http/session.guard';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    PrismaIdentityRepository,
    PrismaSessionStore,
    SessionGuard,
    GithubTokenReader,
    EnqueueProfileImport,
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
      inject: [ENV, PrismaIdentityRepository, PrismaSessionStore, EnqueueProfileImport],
      useFactory: (
        env: Env,
        accounts: PrismaIdentityRepository,
        sessions: PrismaSessionStore,
        signUps: EnqueueProfileImport,
      ) =>
        new SignInWithGithub(
          accounts,
          sessions,
          new AesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY),
          { now: () => new Date() },
          signUps,
        ),
    },
  ],
  exports: [SessionGuard, PrismaSessionStore, GithubTokenReader],
})
export class IdentityModule {}
