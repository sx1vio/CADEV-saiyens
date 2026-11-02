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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
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
    const [users, newUsers7d, questions, answers, rooms, openReports, publishedJobs, draftJobs] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: real }),
        this.prisma.user.count({ where: { ...real, createdAt: { gte: weekAgo } } }),
        this.prisma.question.count(),
        this.prisma.answer.count(),
        this.prisma.room.count(),
        this.prisma.report.count({ where: { status: 'open' } }),
        this.prisma.jobOffer.count({ where: { status: 'published' } }),
        this.prisma.jobOffer.count({ where: { status: 'draft' } }),
      ]);
    return { users, newUsers7d, questions, answers, rooms, openReports, publishedJobs, draftJobs };
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
}
