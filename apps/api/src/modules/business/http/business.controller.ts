import { createHash } from 'node:crypto';
import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  ForbiddenException,
  Logger,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  ApplicationStatusRequest,
  type ApplicationView,
  BusinessInviteRequest,
  type BusinessInviteResponse,
  BusinessJobInput,
  type BusinessJobView,
  BusinessLoginRequest,
  type BusinessMeView,
  BusinessPasswordChange,
  BusinessRegisterRequest,
  type BusinessTeamMember,
  CompanyProfileInput,
  type CompanyView,
  PasswordForgotRequest,
  PasswordResetRequest,
  type RecentApplicationView,
} from '@devhub/contracts';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { MAILER, type Mailer } from '../../../infrastructure/mail/mailer';
import {
  AttemptLimiter,
  PasswordResets,
  ScryptPasswordHasher,
  baseCookie,
  hashSessionToken,
  newSessionToken,
  readCookie,
  resetEmail,
} from '../../identity';
import {
  BusinessRepository,
  CompanyNotVerifiedError,
  EmailTakenError,
} from '../infrastructure/business.repository';
import { BusinessSessionStore } from '../infrastructure/business-session.store';
import {
  BUSINESS_COOKIE,
  type BusinessRequest,
  BusinessSessionGuard,
  assertBusinessChannel,
  notFound,
} from './business-session.guard';

class RegisterDto extends createZodDto(BusinessRegisterRequest) {}
class LoginDto extends createZodDto(BusinessLoginRequest) {}
class CompanyDto extends createZodDto(CompanyProfileInput) {}
class JobDto extends createZodDto(BusinessJobInput) {}
class StatusDto extends createZodDto(ApplicationStatusRequest) {}
class ForgotDto extends createZodDto(PasswordForgotRequest) {}
class ResetDto extends createZodDto(PasswordResetRequest) {}
class PasswordChangeDto extends createZodDto(BusinessPasswordChange) {}
class InviteDto extends createZodDto(BusinessInviteRequest) {}

/** Mot de passe provisoire lisible : 16 caractères sans ambiguïté (pas de 0/O, 1/l). */
function provisionalPassword(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...randomBytes(16)].map((b) => alphabet[b % alphabet.length]).join('');
}

const ownerOnly = () =>
  new ForbiddenException({ code: 'business.owner_only', title: 'Only the owner can do this' });

const cookie = { ...baseCookie, sameSite: 'strict' as const };
const DUMMY_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const notVerified = () =>
  new UnprocessableEntityException({
    code: 'company.not_verified',
    title: 'The company must be verified before publishing',
  });

// Portail entreprise : invisible (404) hors de son origine, session recruteur séparée.
@ApiExcludeController()
@Controller('api/v1/business')
export class BusinessController {
  private readonly limiter = new AttemptLimiter();
  private readonly hasher = new ScryptPasswordHasher();
  private readonly logger = new Logger(BusinessController.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly repo: BusinessRepository,
    private readonly sessions: BusinessSessionStore,
    private readonly resets: PasswordResets,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  private ipKey(req: Request): string {
    return createHash('sha256')
      .update((req.ip ?? '') + this.env.SESSION_SECRET)
      .digest('hex')
      .slice(0, 32);
  }

  private guardRate(req: Request) {
    if (this.limiter.blocked(this.ipKey(req)))
      throw new HttpException(
        { code: 'rate_limited', title: 'Too many attempts, try again later' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }

  private async open(res: Response, accountId: string) {
    const token = newSessionToken();
    const expiresAt = await this.sessions.create(hashSessionToken(token), accountId, new Date());
    res.cookie(BUSINESS_COOKIE, token, { ...cookie, expires: expiresAt });
  }

  @Post('register')
  @HttpCode(204)
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    assertBusinessChannel(req, this.env);
    this.guardRate(req);
    try {
      const id = await this.repo.register(body, await this.hasher.hash(body.account.password));
      await this.open(res, id);
    } catch (e) {
      if (e instanceof EmailTakenError) {
        this.limiter.fail(this.ipKey(req));
        throw new ConflictException({
          code: 'auth.email_taken',
          title: 'Email already registered',
        });
      }
      throw e;
    }
  }

  @Post('session')
  @HttpCode(204)
  async signIn(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    assertBusinessChannel(req, this.env);
    this.guardRate(req);
    const account = await this.repo.findAccountByEmail(body.email);
    const ok = await this.hasher.verify(body.password, account?.passwordHash ?? DUMMY_HASH);
    if (!account || !ok) {
      this.limiter.fail(this.ipKey(req));
      throw new UnauthorizedException({
        code: 'auth.bad_credentials',
        title: 'Wrong email or password',
      });
    }
    await this.open(res, account.id);
  }

  @Delete('session')
  @HttpCode(204)
  @UseGuards(BusinessSessionGuard)
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = readCookie(req, BUSINESS_COOKIE);
    if (token) await this.sessions.delete(hashSessionToken(token));
    res.clearCookie(BUSINESS_COOKIE, cookie);
  }

  /** Mot de passe oublié : toujours 204 (on ne révèle pas quelles adresses ont un compte). */
  @Post('password/forgot')
  @HttpCode(204)
  async forgot(@Body() body: ForgotDto, @Req() req: Request): Promise<void> {
    assertBusinessChannel(req, this.env);
    this.guardRate(req);
    this.limiter.fail(this.ipKey(req));
    const account = await this.repo.findResettable(body.email);
    if (!account) return;
    const token = await this.resets.issue('business', account.id);
    // Jeton dans le fragment : le portail le lit, il n'atteint jamais un serveur ni un journal.
    const url = `${new URL(this.env.BUSINESS_URL!).origin}/#reinitialiser=${token}`;
    try {
      await this.mailer.send({
        to: account.email,
        ...resetEmail({ name: account.name, url, product: 'DevHub Business', formal: true }),
      });
    } catch (err) {
      this.logger.error({ err }, 'E-mail de réinitialisation non envoyé');
    }
  }

  @Post('password/reset')
  @HttpCode(204)
  async reset(@Body() body: ResetDto, @Req() req: Request): Promise<void> {
    assertBusinessChannel(req, this.env);
    this.guardRate(req);
    // Règle des comptes recruteurs (10 caractères), vérifiée avant de consommer le lien.
    if (body.password.length < 10)
      throw new BadRequestException({
        code: 'validation.failed',
        title: 'Password too short',
        errors: [{ path: ['password'], message: '10 caractères au moins' }],
      });
    const accountId = await this.resets.consume('business', body.token);
    if (!accountId) {
      this.limiter.fail(this.ipKey(req));
      throw new BadRequestException({
        code: 'auth.reset_invalid',
        title: 'This reset link is invalid or has expired',
      });
    }
    await this.repo.setPassword(accountId, await this.hasher.hash(body.password));
  }

  /** Changer son mot de passe : les autres sessions du compte sont fermées. */
  @Put('account/password')
  @HttpCode(204)
  @UseGuards(BusinessSessionGuard)
  async changePassword(@Body() body: PasswordChangeDto, @Req() req: BusinessRequest) {
    this.guardRate(req);
    const account = await this.repo.findAccount(req.biz!.accountId);
    if (!account || !(await this.hasher.verify(body.current, account.passwordHash))) {
      this.limiter.fail(this.ipKey(req));
      throw new UnauthorizedException({
        code: 'auth.bad_credentials',
        title: 'Wrong current password',
      });
    }
    await this.repo.setPassword(account.id, await this.hasher.hash(body.password), req.biz!.idHash);
  }

  @Get('team')
  @UseGuards(BusinessSessionGuard)
  async team(@Req() req: BusinessRequest): Promise<{ data: BusinessTeamMember[] }> {
    return { data: await this.repo.team(req.biz!.companyId) };
  }

  /** Le propriétaire ajoute un recruteur ; le mot de passe provisoire n'est montré qu'une fois. */
  @Post('team')
  @UseGuards(BusinessSessionGuard)
  async invite(
    @Body() body: InviteDto,
    @Req() req: BusinessRequest,
  ): Promise<BusinessInviteResponse> {
    if (req.biz!.role !== 'owner') throw ownerOnly();
    const password = provisionalPassword();
    try {
      const member = await this.repo.addRecruiter(
        req.biz!.companyId,
        body,
        await this.hasher.hash(password),
      );
      return { member, password };
    } catch (e) {
      if (e instanceof EmailTakenError)
        throw new ConflictException({
          code: 'auth.email_taken',
          title: 'Email already registered',
        });
      throw e;
    }
  }

  @Delete('team/:id')
  @HttpCode(204)
  @UseGuards(BusinessSessionGuard)
  async removeMember(@Param('id', ParseUUIDPipe) id: string, @Req() req: BusinessRequest) {
    if (req.biz!.role !== 'owner') throw ownerOnly();
    if (!(await this.repo.removeRecruiter(req.biz!.companyId, id))) throw notFound();
  }

  @Get('applications')
  @UseGuards(BusinessSessionGuard)
  async recent(
    @Req() req: BusinessRequest,
    @Query('limit') limit?: string,
  ): Promise<{ data: RecentApplicationView[] }> {
    const take = Math.min(50, Math.max(1, Number(limit) || 8));
    return { data: await this.repo.recentApplications(req.biz!.companyId, take) };
  }

  @Get('me')
  @UseGuards(BusinessSessionGuard)
  me(@Req() req: BusinessRequest): Promise<BusinessMeView> {
    return this.repo.me(req.biz!.accountId);
  }

  @Put('company')
  @UseGuards(BusinessSessionGuard)
  updateCompany(@Body() body: CompanyDto, @Req() req: BusinessRequest): Promise<CompanyView> {
    return this.repo.updateCompany(req.biz!.companyId, body);
  }

  @Get('jobs')
  @UseGuards(BusinessSessionGuard)
  async jobs(@Req() req: BusinessRequest): Promise<{ data: BusinessJobView[] }> {
    return { data: await this.repo.listJobs(req.biz!.companyId) };
  }

  @Post('jobs')
  @UseGuards(BusinessSessionGuard)
  async createJob(@Body() body: JobDto, @Req() req: BusinessRequest): Promise<BusinessJobView> {
    try {
      return await this.repo.createJob(req.biz!.companyId, body, new Date());
    } catch (e) {
      if (e instanceof CompanyNotVerifiedError) throw notVerified();
      throw e;
    }
  }

  @Put('jobs/:id')
  @UseGuards(BusinessSessionGuard)
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: JobDto,
    @Req() req: BusinessRequest,
  ): Promise<BusinessJobView> {
    try {
      const job = await this.repo.updateJob(req.biz!.companyId, id, body, new Date());
      if (!job) throw notFound();
      return job;
    } catch (e) {
      if (e instanceof CompanyNotVerifiedError) throw notVerified();
      throw e;
    }
  }

  @Delete('jobs/:id')
  @HttpCode(204)
  @UseGuards(BusinessSessionGuard)
  async deleteJob(@Param('id', ParseUUIDPipe) id: string, @Req() req: BusinessRequest) {
    if (!(await this.repo.deleteJob(req.biz!.companyId, id))) throw notFound();
  }

  @Get('jobs/:id/applications')
  @UseGuards(BusinessSessionGuard)
  async applications(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: BusinessRequest,
  ): Promise<{ data: ApplicationView[] }> {
    const data = await this.repo.applications(req.biz!.companyId, id);
    if (!data) throw notFound();
    return { data };
  }

  @Patch('applications/:id')
  @HttpCode(204)
  @UseGuards(BusinessSessionGuard)
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: StatusDto,
    @Req() req: BusinessRequest,
  ) {
    if (!(await this.repo.setApplicationStatus(req.biz!.companyId, id, body.status)))
      throw notFound();
  }
}
