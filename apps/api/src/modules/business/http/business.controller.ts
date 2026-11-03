import { createHash } from 'node:crypto';
import {
  Body,
  ConflictException,
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
  BusinessJobInput,
  type BusinessJobView,
  BusinessLoginRequest,
  type BusinessMeView,
  BusinessRegisterRequest,
  CompanyProfileInput,
  type CompanyView,
} from '@devhub/contracts';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import {
  AttemptLimiter,
  ScryptPasswordHasher,
  baseCookie,
  hashSessionToken,
  newSessionToken,
  readCookie,
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

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly repo: BusinessRepository,
    private readonly sessions: BusinessSessionStore,
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
