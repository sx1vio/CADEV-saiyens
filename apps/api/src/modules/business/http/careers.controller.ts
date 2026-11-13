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
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  ApplyRequest,
  CV_MAX_BYTES,
  CompanyPublicView,
  type MyApplicationView,
  UploadCvResponse,
} from '@devhub/contracts';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { MAILER, type Mailer } from '../../../infrastructure/mail/mailer';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { cvFileName, isPdf, newApplicationEmail } from '../domain/application-emails';
import { BusinessRepository } from '../infrastructure/business.repository';

class ApplyDto extends createZodDto(ApplyRequest) {}
class CompanyPublicViewDto extends createZodDto(CompanyPublicView) {}
class UploadCvResponseDto extends createZodDto(UploadCvResponse) {}

const notFound = () => new NotFoundException({ code: 'not_found', title: 'Not found' });
const DAY = 24 * 60 * 60 * 1000;
const CV_PER_DAY = 10;

/** Lit le corps brut de la requête, en coupant au-delà de la limite. */
export function readBody(req: Request, limit: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    req.on('data', (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > limit) {
        done = true;
        resolve(null);
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!done) resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

/** Envoie un PDF en pièce jointe, sans qu'il puisse s'exécuter dans l'origine du site. */
export function sendPdf(res: Response, name: string, bytes: Uint8Array) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(bytes.length));
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${cvFileName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.end(Buffer.from(bytes));
}

// Côté devs : page publique des entreprises validées, candidature avec son Passport.
@Controller('api/v1')
export class CareersController {
  private readonly logger = new Logger(CareersController.name);

  constructor(
    private readonly repo: BusinessRepository,
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  @Get('companies/:slug')
  @ApiOkResponse({ type: CompanyPublicViewDto })
  async company(@Param('slug') slug: string): Promise<CompanyPublicView> {
    const c = await this.repo.publicCompany(slug.slice(0, 80), new Date());
    if (!c) throw notFound();
    return c;
  }

  @Post('jobs/:id/apply')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async apply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApplyDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    const r = await this.repo.apply(id, auth.userId, body, new Date());
    if (r.kind === 'not_found') throw notFound();
    if (r.kind === 'already')
      throw new ConflictException({ code: 'application.exists', title: 'Already applied' });
    if (r.kind === 'bad_cv')
      throw new UnprocessableEntityException({ code: 'application.cv', title: 'Unknown CV' });
    if (r.kind === 'external')
      throw new UnprocessableEntityException({
        code: 'job.external',
        title: 'This offer is applied for on the publisher’s site',
        detail: r.url ?? undefined,
      });
    // Les recruteurs sont prévenus ; un e-mail qui échoue n'annule pas la candidature.
    if (this.mailer.configured && this.env.BUSINESS_URL) {
      const url = `${this.env.BUSINESS_URL.replace(/\/$/, '')}/#offres/${id}`;
      for (const rec of r.recruiters) {
        const mail = newApplicationEmail({
          recruiter: rec.name,
          candidate: r.candidate.displayName,
          jobTitle: r.jobTitle,
          url,
        });
        this.mailer
          .send({ to: rec.email, ...mail })
          .catch((e: unknown) => this.logger.warn(`new application e-mail failed: ${String(e)}`));
      }
    }
  }

  /** CV en PDF (octets bruts), joint ensuite à une candidature avec `cvId`. */
  @Post('me/cv')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: UploadCvResponseDto })
  async uploadCv(
    @Req() req: Request,
    @Query('name') name: unknown,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<UploadCvResponse> {
    const recent = await this.prisma.cvFile.count({
      where: { ownerId: auth.userId, createdAt: { gte: new Date(Date.now() - DAY) } },
    });
    if (recent >= CV_PER_DAY)
      throw new HttpException(
        { code: 'cv.daily_limit', title: 'Daily upload limit reached' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const body = await readBody(req, CV_MAX_BYTES);
    if (!body)
      throw new HttpException(
        { code: 'cv.too_large', title: 'PDF larger than 5 MB' },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    if (!isPdf(body))
      throw new UnprocessableEntityException({
        code: 'cv.unsupported',
        title: 'Only PDF files are accepted',
      });
    const file = cvFileName(name);
    const row = await this.prisma.cvFile.create({
      data: { ownerId: auth.userId, name: file, bytes: new Uint8Array(body), size: body.length },
      select: { id: true, name: true, size: true },
    });
    return row;
  }

  @Get('me/cv/:id')
  @UseGuards(SessionGuard)
  async myCv(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() auth: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const cv = await this.repo.myCv(id, auth.userId);
    if (!cv) throw notFound();
    sendPdf(res, cv.name, cv.bytes);
  }

  @Get('me/applications')
  @UseGuards(SessionGuard)
  async mine(@CurrentUser() auth: AuthenticatedUser): Promise<{ data: MyApplicationView[] }> {
    return { data: await this.repo.myApplications(auth.userId) };
  }

  @Delete('me/applications/:id')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async withdraw(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: AuthenticatedUser) {
    if (!(await this.repo.withdraw(id, auth.userId))) throw notFound();
  }
}
