import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  AdminCompanyAction,
  type AdminCompanyView,
  type CompanyStatus,
  type AdminJobView,
  type AdminJobsResponse,
  type AdminOverview,
  JobOfferInput,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { JobOffersRepository } from '../infrastructure/job-offers.repository';
import { type AdminRequest, AdminSessionGuard } from './admin-session.guard';

class JobOfferInputDto extends createZodDto(JobOfferInput) {}
class AdminCompanyActionDto extends createZodDto(AdminCompanyAction) {}

const NEXT_STATUS: Record<AdminCompanyAction['action'], CompanyStatus> = {
  verify: 'verified',
  reject: 'rejected',
  suspend: 'suspended',
  restore: 'verified',
};

const notFound = () => new NotFoundException({ code: 'not_found', title: 'Not found' });

// Routes de l'application d'administration : invisibles (404) sans session d'administration.
@ApiExcludeController()
@Controller('api/v1/admin')
@UseGuards(AdminSessionGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobOffersRepository,
  ) {}

  @Get('overview')
  async overview(): Promise<AdminOverview> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const real = { deletedAt: null, isDemo: false };
    const [
      users,
      newUsers7d,
      questions,
      answers,
      rooms,
      openReports,
      publishedJobs,
      draftJobs,
      pendingCompanies,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: real }),
      this.prisma.user.count({ where: { ...real, createdAt: { gte: weekAgo } } }),
      this.prisma.question.count(),
      this.prisma.answer.count(),
      this.prisma.room.count(),
      this.prisma.report.count({ where: { status: 'open' } }),
      this.prisma.jobOffer.count({ where: { status: 'published' } }),
      this.prisma.jobOffer.count({ where: { status: 'draft' } }),
      this.prisma.company.count({ where: { status: 'pending' } }),
    ]);
    return {
      users,
      newUsers7d,
      questions,
      answers,
      rooms,
      openReports,
      publishedJobs,
      draftJobs,
      pendingCompanies,
    };
  }

  @Get('jobs')
  async listJobs(): Promise<AdminJobsResponse> {
    return { data: await this.jobs.listAll() };
  }

  @Post('jobs')
  async createJob(@Body() body: JobOfferInputDto, @Req() req: AdminRequest): Promise<AdminJobView> {
    return this.jobs.create(body, req.admin!.userId, new Date());
  }

  @Put('jobs/:id')
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: JobOfferInputDto,
    @Req() req: AdminRequest,
  ): Promise<AdminJobView> {
    const job = await this.jobs.update(id, body, req.admin!.userId, new Date());
    if (!job) throw notFound();
    return job;
  }

  @Delete('jobs/:id')
  @HttpCode(204)
  async deleteJob(@Param('id', ParseUUIDPipe) id: string, @Req() req: AdminRequest) {
    if (!(await this.jobs.delete(id, req.admin!.userId))) throw notFound();
  }

  @Get('companies')
  async companies(@Query('status') status?: string): Promise<{ data: AdminCompanyView[] }> {
    const rows = await this.prisma.company.findMany({
      where: status ? { status } : {},
      orderBy: [{ createdAt: 'desc' }],
      take: 500,
      include: {
        members: { select: { name: true, email: true, role: true, lastLoginAt: true } },
        offers: { select: { _count: { select: { applications: true } } } },
      },
    });
    return {
      data: rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        website: c.website,
        country: c.country,
        city: c.city,
        sector: c.sector,
        size: c.size as AdminCompanyView['size'],
        about: c.about,
        status: c.status as CompanyStatus,
        statusReason: c.statusReason,
        verifiedAt: c.verifiedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        accounts: c.members.map((m) => ({
          name: m.name,
          email: m.email,
          role: m.role,
          lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
        })),
        offers: c.offers.length,
        applications: c.offers.reduce((n, o) => n + o._count.applications, 0),
      })),
    };
  }

  /** Valider, refuser, suspendre ou réactiver une entreprise ; journalisé. */
  @Post('companies/:id/action')
  @HttpCode(204)
  async companyAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminCompanyActionDto,
    @Req() req: AdminRequest,
  ) {
    const c = await this.prisma.company.findUnique({ where: { id } });
    if (!c) throw notFound();
    const status = NEXT_STATUS[body.action];
    await this.prisma.$transaction([
      this.prisma.company.update({
        where: { id },
        data: {
          status,
          statusReason: body.reason || null,
          ...(status === 'verified' && !c.verifiedAt ? { verifiedAt: new Date() } : {}),
        },
      }),
      // Suspendre ferme aussi les sessions des recruteurs.
      ...(status === 'suspended'
        ? [this.prisma.businessSession.deleteMany({ where: { account: { companyId: id } } })]
        : []),
      this.prisma.adminAction.create({
        data: {
          adminId: req.admin!.userId,
          action: `company_${body.action}`,
          targetType: 'company',
          targetId: id,
          reason: `${c.name}${body.reason ? ` · ${body.reason}` : ''}`.slice(0, 500),
        },
      }),
    ]);
  }
}
