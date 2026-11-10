import { createHash } from 'node:crypto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AdminLoginRequest, type AdminSessionView } from '@devhub/contracts';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { AttemptLimiter, baseCookie, hashSessionToken, readCookie } from '../../identity';
import { AdminAuth } from '../infrastructure/admin-auth';
import { AdminSessionStore } from '../infrastructure/admin-session.store';
import {
  ADMIN_COOKIE,
  type AdminRequest,
  AdminSessionGuard,
  assertAdminChannel,
} from './admin-session.guard';

class AdminLoginRequestDto extends createZodDto(AdminLoginRequest) {}

// Cookie strict : jamais envoyé depuis un autre site, même par un lien.
const adminCookie = { ...baseCookie, sameSite: 'strict' as const };

@ApiExcludeController()
@Controller('api/v1/admin/session')
export class AdminAuthController {
  // Par IP et par adresse : 10 échecs en 15 minutes, puis 429.
  private readonly byIp = new AttemptLimiter();
  private readonly byEmail = new AttemptLimiter();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: AdminAuth,
    private readonly sessions: AdminSessionStore,
  ) {}

  @Post()
  @HttpCode(204)
  async signIn(
    @Body() body: AdminLoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    assertAdminChannel(req, this.env);
    const ipKey = this.ipHash(req) ?? 'unknown';
    if (this.byIp.blocked(ipKey) || this.byEmail.blocked(body.email))
      throw new HttpException(
        { code: 'rate_limited', title: 'Too many attempts, try again later' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const result = await this.auth.signIn(body, {
      userAgent: req.headers['user-agent'] ?? null,
      ipHash: this.ipHash(req),
    });
    if (!result) {
      this.byIp.fail(ipKey);
      this.byEmail.fail(body.email);
      // Une seule réponse, quelle que soit l'étape qui a échoué.
      throw new UnauthorizedException({
        code: 'admin.bad_credentials',
        title: 'Wrong email or password',
      });
    }
    res.cookie(ADMIN_COOKIE, result.token, { ...adminCookie, expires: result.expiresAt });
  }

  @Get()
  @UseGuards(AdminSessionGuard)
  me(@Req() req: AdminRequest): AdminSessionView {
    const s = req.admin!;
    return {
      handle: s.handle,
      displayName: s.displayName,
      role: s.role,
      expiresAt: s.expiresAt.toISOString(),
    };
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(AdminSessionGuard)
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = readCookie(req, ADMIN_COOKIE);
    if (token) await this.sessions.delete(hashSessionToken(token));
    res.clearCookie(ADMIN_COOKIE, adminCookie);
  }

  private ipHash(req: Request): string | null {
    return req.ip
      ? createHash('sha256')
          .update(req.ip + this.env.SESSION_SECRET)
          .digest('hex')
          .slice(0, 32)
      : null;
  }
}
