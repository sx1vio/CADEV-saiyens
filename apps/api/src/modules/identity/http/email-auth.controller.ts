import { createHash } from 'node:crypto';
import {
  ForbiddenException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { MobileTokenResponse } from '@devhub/contracts';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import type { SignInContext, SignInResult } from '../application/sign-in-with-github';
import {
  BadCredentialsError,
  EmailTakenError,
  SignInWithEmail,
} from '../application/sign-in-with-email';
import { PrismaSessionStore } from '../infrastructure/prisma-session.store';
import { AttemptLimiter } from './attempt-limiter';
import { SESSION_COOKIE, baseCookie } from './cookies';
import { EmailLoginRequestDto, EmailRegisterRequestDto } from './email-auth.dto';
import { AllowCrossOrigin } from './origin.guard';

class MobileTokenResponseDto extends createZodDto(MobileTokenResponse) {}

function toMobileToken(result: SignInResult): MobileTokenResponse {
  return { sessionToken: result.sessionToken, expiresAt: result.sessionExpiresAt.toISOString() };
}

// Inscription et connexion par e-mail. Réponse 204 et cookie de session, comme le retour
// d'OAuth ; le front relit GET /me. Écritures : X-DevHub-Client exigé (OriginGuard global).
@Controller('api/v1/auth/email')
export class EmailAuthController {
  private readonly limiter = new AttemptLimiter();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: SignInWithEmail,
    private readonly sessions: PrismaSessionStore,
  ) {}

  @Post('register')
  @HttpCode(204)
  async register(
    @Body() body: EmailRegisterRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    this.open(res, await this.signUp(body, req));
  }

  @Post('login')
  @HttpCode(204)
  async login(
    @Body() body: EmailLoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    this.open(res, await this.signIn(body, req));
  }

  /**
   * Variantes de l'application mobile (ADR-0021) : la session revient dans la réponse, pour
   * « Authorization: Bearer », jamais en cookie. Sans cookie posé, une page tierce ne peut ni
   * lire la réponse (CORS) ni connecter le navigateur à un autre compte : pas de contrôle d'origine.
   */
  @Post('register/mobile')
  @HttpCode(201)
  @AllowCrossOrigin()
  @ApiOkResponse({ type: MobileTokenResponseDto })
  async registerMobile(
    @Body() body: EmailRegisterRequestDto,
    @Req() req: Request,
  ): Promise<MobileTokenResponse> {
    return toMobileToken(await this.signUp(body, req));
  }

  @Post('login/mobile')
  @HttpCode(200)
  @AllowCrossOrigin()
  @ApiOkResponse({ type: MobileTokenResponseDto })
  async loginMobile(
    @Body() body: EmailLoginRequestDto,
    @Req() req: Request,
  ): Promise<MobileTokenResponse> {
    return toMobileToken(await this.signIn(body, req));
  }

  private async signUp(body: EmailRegisterRequestDto, req: Request): Promise<SignInResult> {
    const context = this.context(req);
    this.guard(context);
    try {
      return await this.auth.signUp(body, context);
    } catch (err) {
      if (err instanceof EmailTakenError) {
        // Compte comme un échec : sinon on pourrait sonder librement les adresses inscrites
        this.limiter.fail(context.ipHash ?? 'unknown');
        throw new ConflictException({
          code: 'auth.email_taken',
          title: 'Email already registered',
        });
      }
      throw err;
    }
  }

  private async signIn(body: EmailLoginRequestDto, req: Request): Promise<SignInResult> {
    const context = this.context(req);
    this.guard(context);
    try {
      const result = await this.auth.signIn(body.email, body.password, context);
      if (await this.sessions.rejectIfSuspended(result.userId))
        throw new ForbiddenException({ code: 'auth.suspended', title: 'Account suspended' });
      return result;
    } catch (err) {
      if (err instanceof BadCredentialsError) {
        this.limiter.fail(context.ipHash ?? 'unknown');
        throw new UnauthorizedException({
          code: 'auth.bad_credentials',
          title: 'Wrong email or password',
        });
      }
      throw err;
    }
  }

  private guard(context: SignInContext): void {
    if (this.limiter.blocked(context.ipHash ?? 'unknown'))
      throw new HttpException(
        { code: 'rate_limited', title: 'Too many attempts, try again later' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }

  private open(res: Response, result: SignInResult): void {
    res.cookie(SESSION_COOKIE, result.sessionToken, {
      ...baseCookie,
      expires: result.sessionExpiresAt,
    });
  }

  private context(req: Request): SignInContext {
    return {
      userAgent: req.headers['user-agent'] ?? null,
      ipHash: req.ip
        ? createHash('sha256')
            .update(req.ip + this.env.SESSION_SECRET)
            .digest('hex')
            .slice(0, 32)
        : null,
    };
  }
}
