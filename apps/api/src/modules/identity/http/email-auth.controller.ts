import { createHash } from 'node:crypto';
import {
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
import type { Request, Response } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import type { SignInContext, SignInResult } from '../application/sign-in-with-github';
import {
  BadCredentialsError,
  EmailTakenError,
  SignInWithEmail,
} from '../application/sign-in-with-email';
import { AttemptLimiter } from './attempt-limiter';
import { SESSION_COOKIE, baseCookie } from './cookies';
import { EmailLoginRequestDto, EmailRegisterRequestDto } from './email-auth.dto';

// Inscription et connexion par e-mail. Réponse 204 et cookie de session, comme le retour
// d'OAuth ; le front relit GET /me. Écritures : X-DevHub-Client exigé (OriginGuard global).
@Controller('api/v1/auth/email')
export class EmailAuthController {
  private readonly limiter = new AttemptLimiter();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: SignInWithEmail,
  ) {}

  @Post('register')
  @HttpCode(204)
  async register(
    @Body() body: EmailRegisterRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const context = this.context(req);
    this.guard(context);
    try {
      this.open(res, await this.auth.signUp(body, context));
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

  @Post('login')
  @HttpCode(204)
  async login(
    @Body() body: EmailLoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const context = this.context(req);
    this.guard(context);
    try {
      this.open(res, await this.auth.signIn(body.email, body.password, context));
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
