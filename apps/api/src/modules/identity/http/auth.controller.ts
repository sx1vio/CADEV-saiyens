import { createHash } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { MobileTokenRequest, MobileTokenResponse } from '@devhub/contracts';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { LinkGithub, LinkGithubRefused } from '../application/link-github';
import { SignInWithGithub } from '../application/sign-in-with-github';
import type { GithubOAuthProvider } from '../domain/ports';
import {
  OAUTH_STATE_TTL_MS,
  type OAuthState,
  codeChallenge,
  newOAuthState,
  openOAuthState,
  safeReturnTo,
  sealOAuthState,
} from '../infrastructure/oauth-state';
import {
  isCodeChallenge,
  openMobileHandoff,
  sealMobileHandoff,
} from '../infrastructure/mobile-handoff';
import { PrismaSessionStore } from '../infrastructure/prisma-session.store';
import { OAUTH_STATE_COOKIE, SESSION_COOKIE, baseCookie, readCookie } from './cookies';
import { AllowCrossOrigin } from './origin.guard';
import {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from './session.guard';

class MobileTokenRequestDto extends createZodDto(MobileTokenRequest) {}
class MobileTokenResponseDto extends createZodDto(MobileTokenResponse) {}

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
    private readonly linkGithub: LinkGithub,
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
    this.authorize(res, newOAuthState(safeReturnTo(returnTo), Date.now()), loginHint);
  }

  /**
   * Relier GitHub à un compte ouvert par e-mail (12/11/2026), depuis les réglages ou le Passport.
   * Navigation du navigateur : session par cookie uniquement (jamais un jeton d'API).
   */
  @Get('github/link')
  @UseGuards(OptionalSessionGuard)
  startLink(
    @OptionalUser() auth: AuthenticatedUser | null,
    @Query('returnTo') returnTo: unknown,
    @Query('login') loginHint: string | undefined,
    @Res() res: Response,
  ): void {
    const back = safeReturnTo(returnTo === undefined ? '/reglages' : returnTo);
    if (!auth || auth.tokenScope) {
      const url = new URL('/connexion', this.env.APP_URL);
      url.searchParams.set('next', back);
      return res.redirect(302, url.toString());
    }
    this.authorize(res, newOAuthState(back, Date.now(), undefined, auth.userId), loginHint);
  }

  /**
   * Connexion depuis l'application mobile (ADR-0021) : ouverte dans le navigateur système,
   * avec le défi PKCE de l'application. Le retour se fait par MOBILE_REDIRECT_URI.
   */
  @Get('github/mobile')
  startMobile(
    @Query('challenge') challenge: unknown,
    @Query('login') loginHint: string | undefined,
    @Res() res: Response,
  ): void {
    if (!isCodeChallenge(challenge)) return this.failMobile(res, 'invalid_request');
    this.authorize(res, newOAuthState('/', Date.now(), challenge), loginHint);
  }

  private authorize(res: Response, state: OAuthState, loginHint: string | undefined): void {
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

    const oauth = openOAuthState(sealed, state, this.env.SESSION_SECRET, Date.now());
    const fail = (reason: string) =>
      oauth?.appChallenge ? this.failMobile(res, reason) : this.fail(res, reason);
    if (error) return fail(error === 'access_denied' ? 'access_denied' : 'github_error');
    if (!oauth || !code) return fail('invalid_state');

    if (oauth.linkUserId) return this.finishLink(res, oauth, code);

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
      if (await this.sessions.rejectIfSuspended(result.userId)) return fail('suspended');
      if (oauth.appChallenge) {
        const handoff = sealMobileHandoff(
          {
            sessionToken: result.sessionToken,
            sessionExpiresAt: result.sessionExpiresAt.toISOString(),
          },
          oauth.appChallenge,
          this.env.SESSION_SECRET,
          Date.now(),
        );
        return this.redirectMobile(res, { code: handoff });
      }
      res.cookie(SESSION_COOKIE, result.sessionToken, {
        ...baseCookie,
        expires: result.sessionExpiresAt,
      });
      res.redirect(302, new URL(oauth.returnTo, this.env.APP_URL).toString());
    } catch (err) {
      this.logger.error({ err }, 'Connexion GitHub échouée');
      fail('github_unavailable');
    }
  }

  /**
   * Échange du code de retour mobile contre le jeton de session. Sans cookie ni origine web :
   * c'est le secret PKCE de l'application qui fait la preuve, d'où l'exemption d'OriginGuard.
   */
  @Post('mobile/token')
  @HttpCode(200)
  @AllowCrossOrigin()
  @ApiOkResponse({ type: MobileTokenResponseDto })
  mobileToken(@Body() body: MobileTokenRequestDto): MobileTokenResponse {
    const handoff = openMobileHandoff(
      body.code,
      body.codeVerifier,
      this.env.SESSION_SECRET,
      Date.now(),
    );
    if (!handoff) {
      throw new UnauthorizedException({
        code: 'auth.invalid_code',
        title: 'Invalid or expired sign-in code',
      });
    }
    return { sessionToken: handoff.sessionToken, expiresAt: handoff.sessionExpiresAt };
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

  private async finishLink(res: Response, oauth: OAuthState, code: string): Promise<void> {
    const back = new URL(oauth.returnTo, this.env.APP_URL);
    try {
      const identity = await this.github.exchange(code, oauth.codeVerifier, this.redirectUri);
      await this.linkGithub.execute(oauth.linkUserId!, identity);
      back.searchParams.set('github', 'relie');
    } catch (err) {
      if (err instanceof LinkGithubRefused) {
        back.searchParams.set('github', err.reason);
      } else {
        this.logger.error({ err }, 'Liaison GitHub échouée');
        back.searchParams.set('github', 'github_unavailable');
      }
    }
    res.redirect(302, back.toString());
  }

  private failMobile(res: Response, reason: string): void {
    this.redirectMobile(res, { error: reason });
  }

  private redirectMobile(res: Response, params: Record<string, string>): void {
    const url = new URL(this.env.MOBILE_REDIRECT_URI);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    res.redirect(302, url.toString());
  }

  private fail(res: Response, reason: string): void {
    const url = new URL('/connexion', this.env.APP_URL);
    url.searchParams.set('erreur', reason);
    res.redirect(302, url.toString());
  }
}
