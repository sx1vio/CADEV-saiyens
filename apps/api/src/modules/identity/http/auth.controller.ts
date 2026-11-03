import { createHash } from 'node:crypto';
import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { SignInWithGithub } from '../application/sign-in-with-github';
import type { GithubOAuthProvider } from '../domain/ports';
import {
  OAUTH_STATE_TTL_MS,
  codeChallenge,
  newOAuthState,
  openOAuthState,
  safeReturnTo,
  sealOAuthState,
} from '../infrastructure/oauth-state';
import { PrismaSessionStore } from '../infrastructure/prisma-session.store';
import { OAUTH_STATE_COOKIE, SESSION_COOKIE, baseCookie, readCookie } from './cookies';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from './session.guard';

export const GITHUB_OAUTH_PROVIDER = Symbol('GITHUB_OAUTH_PROVIDER');

// A1 : connexion GitHub. Ces routes sont des navigations du navigateur : en cas d'échec,
// on redirige vers le front avec un code d'erreur plutôt que de renvoyer du JSON.
@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly redirectUri: string;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(GITHUB_OAUTH_PROVIDER) private readonly github: GithubOAuthProvider,
    private readonly signIn: SignInWithGithub,
    private readonly sessions: PrismaSessionStore,
  ) {
    this.redirectUri = new URL('/api/v1/auth/github/callback', env.API_URL).toString();
  }

  @Get('github')
  start(
    @Query('returnTo') returnTo: unknown,
    @Query('login') loginHint: string | undefined,
    @Res() res: Response,
  ): void {
    const state = newOAuthState(safeReturnTo(returnTo), Date.now());
    res.cookie(OAUTH_STATE_COOKIE, sealOAuthState(state, this.env.SESSION_SECRET), {
      ...baseCookie,
      maxAge: OAUTH_STATE_TTL_MS,
    });
    res.redirect(
      302,
      this.github.authorizeUrl({
        state: state.state,
        codeChallenge: codeChallenge(state.codeVerifier),
        redirectUri: this.redirectUri,
        loginHint: this.env.AUTH_FAKE_PROVIDER ? loginHint : undefined,
      }),
    );
  }

  @Get('github/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const sealed = readCookie(req, OAUTH_STATE_COOKIE);
    res.clearCookie(OAUTH_STATE_COOKIE, baseCookie);

    if (error) return this.fail(res, error === 'access_denied' ? 'access_denied' : 'github_error');
    const oauth = openOAuthState(sealed, state, this.env.SESSION_SECRET, Date.now());
    if (!oauth || !code) return this.fail(res, 'invalid_state');

    try {
      const identity = await this.github.exchange(code, oauth.codeVerifier, this.redirectUri);
      const result = await this.signIn.execute(identity, {
        userAgent: req.headers['user-agent'] ?? null,
        ipHash: req.ip
          ? createHash('sha256')
              .update(req.ip + this.env.SESSION_SECRET)
              .digest('hex')
              .slice(0, 32)
          : null,
      });
      if (await this.sessions.rejectIfSuspended(result.userId)) return this.fail(res, 'suspended');
      res.cookie(SESSION_COOKIE, result.sessionToken, {
        ...baseCookie,
        expires: result.sessionExpiresAt,
      });
      res.redirect(302, new URL(oauth.returnTo, this.env.APP_URL).toString());
    } catch (err) {
      this.logger.error({ err }, 'Connexion GitHub échouée');
      this.fail(res, 'github_unavailable');
    }
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async logout(
    @CurrentUser() auth: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.sessions.revoke(auth.sessionIdHash);
    res.clearCookie(SESSION_COOKIE, baseCookie);
  }

  private fail(res: Response, reason: string): void {
    const url = new URL('/connexion', this.env.APP_URL);
    url.searchParams.set('erreur', reason);
    res.redirect(302, url.toString());
  }
}
