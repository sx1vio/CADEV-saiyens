import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Body,
  Logger,
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
import { MAILER, type Mailer } from '../../../infrastructure/mail/mailer';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { SignInContext, SignInResult } from '../application/sign-in-with-github';
import {
  BadCredentialsError,
  EmailTakenError,
  SignInWithEmail,
} from '../application/sign-in-with-email';
import { PasswordResets, resetEmail } from '../infrastructure/password-resets';
import { PrismaSessionStore } from '../infrastructure/prisma-session.store';
import { ScryptPasswordHasher } from '../infrastructure/scrypt-password-hasher';
import { AttemptLimiter } from './attempt-limiter';
import { SESSION_COOKIE, baseCookie } from './cookies';
import {
  EmailLoginRequestDto,
  EmailRegisterRequestDto,
  PasswordForgotRequestDto,
  PasswordResetRequestDto,
} from './email-auth.dto';
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
  private readonly logger = new Logger(EmailAuthController.name);
  private readonly hasher = new ScryptPasswordHasher();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: SignInWithEmail,
    private readonly sessions: PrismaSessionStore,
    private readonly prisma: PrismaService,
    private readonly resets: PasswordResets,
    @Inject(MAILER) private readonly mailer: Mailer,
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

  /**
   * Mot de passe oublié : toujours 204, qu'un compte existe ou non (on ne révèle pas les
   * adresses inscrites). Les comptes d'administration ne se réinitialisent que par la CLI.
   */
  @Post('forgot')
  @HttpCode(204)
  async forgot(@Body() body: PasswordForgotRequestDto, @Req() req: Request): Promise<void> {
    const context = this.context(req);
    this.guard(context);
    // Chaque demande compte : on ne peut pas inonder une boîte de liens.
    this.limiter.fail(context.ipHash ?? 'unknown');
    const user = await this.prisma.user.findFirst({
      where: { email: body.email, passwordHash: { not: null }, deletedAt: null, isAdmin: false },
      select: { id: true, displayName: true, email: true },
    });
    if (!user?.email) return;
    const token = await this.resets.issue('user', user.id);
    const url = new URL('/mot-de-passe', this.env.APP_URL);
    url.hash = token; // dans le fragment : jamais envoyé au serveur ni écrit dans les journaux
    try {
      await this.mailer.send({
        to: user.email,
        ...resetEmail({ name: user.displayName, url: url.toString(), product: 'DevHub' }),
      });
    } catch (err) {
      this.logger.error({ err }, 'E-mail de réinitialisation non envoyé');
    }
  }

  /** Nouveau mot de passe depuis le lien : toutes les sessions du compte sont fermées. */
  @Post('reset')
  @HttpCode(204)
  async reset(@Body() body: PasswordResetRequestDto, @Req() req: Request): Promise<void> {
    const context = this.context(req);
    this.guard(context);
    const userId = await this.resets.consume('user', body.token);
    if (!userId) {
      this.limiter.fail(context.ipHash ?? 'unknown');
      throw new BadRequestException({
        code: 'auth.reset_invalid',
        title: 'This reset link is invalid or has expired',
      });
    }
    const passwordHash = await this.hasher.hash(body.password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
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
