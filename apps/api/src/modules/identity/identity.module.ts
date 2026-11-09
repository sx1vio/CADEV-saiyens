import { Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { MAILER, SmtpMailer } from '../../infrastructure/mail/mailer';
import { SignInWithEmail } from './application/sign-in-with-email';
import { SignInWithGithub } from './application/sign-in-with-github';
import { AesGcmTokenCipher } from './infrastructure/aes-gcm-token-cipher';
import { EnqueueProfileImport } from './infrastructure/enqueue-profile-import.listener';
import { GithubTokenReader } from './infrastructure/github-token.reader';
import { FakeGithubOAuthProvider } from './infrastructure/fake-oauth.provider';
import { GithubOAuthHttpProvider } from './infrastructure/github-oauth.provider';
import { PrismaEmailAccountRepository } from './infrastructure/prisma-email-account.repository';
import { PrismaIdentityRepository } from './infrastructure/prisma-identity.repository';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { PrismaSessionStore } from './infrastructure/prisma-session.store';
import { AuthController, GITHUB_OAUTH_PROVIDER } from './http/auth.controller';
import { EmailAuthController } from './http/email-auth.controller';
import { MeController } from './http/me.controller';
import { AccountDeletion } from './infrastructure/account-deletion';
import { OptionalSessionGuard, SessionGuard } from './http/session.guard';
import { SessionOrTokenGuard } from './http/api-token.guard';
import { ApiTokensController } from './http/api-tokens.controller';
import { PrismaApiTokenStore } from './infrastructure/prisma-api-token.store';
import { PasswordResets } from './infrastructure/password-resets';

@Module({
  controllers: [AuthController, EmailAuthController, MeController, ApiTokensController],
  providers: [
    AccountDeletion,
    PasswordResets,
    { provide: MAILER, useClass: SmtpMailer },
    PrismaIdentityRepository,
    PrismaEmailAccountRepository,
    PrismaSessionStore,
    SessionGuard,
    OptionalSessionGuard,
    PrismaApiTokenStore,
    SessionOrTokenGuard,
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
    {
      provide: SignInWithEmail,
      inject: [PrismaEmailAccountRepository, PrismaSessionStore],
      useFactory: (accounts: PrismaEmailAccountRepository, sessions: PrismaSessionStore) =>
        new SignInWithEmail(accounts, sessions, new ScryptPasswordHasher(), {
          now: () => new Date(),
        }),
    },
  ],
  exports: [
    PasswordResets,
    MAILER,
    SessionGuard,
    OptionalSessionGuard,
    PrismaApiTokenStore,
    SessionOrTokenGuard,
    PrismaSessionStore,
    GithubTokenReader,
    AccountDeletion,
  ],
})
export class IdentityModule {}
