import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { ListJobsResponse, PublicJobView } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { JobOffersRepository } from '../infrastructure/job-offers.repository';

class ListJobsResponseDto extends createZodDto(ListJobsResponse) {}
class PublicJobViewDto extends createZodDto(PublicJobView) {}

// Offres d'emploi publiées par l'administration : publiques, sans compte.
@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobs: JobOffersRepository) {}

  @Get()
  @ApiOkResponse({ type: ListJobsResponseDto })
  async list(): Promise<ListJobsResponse> {
    return { data: await this.jobs.listPublished(new Date()) };
  }

  @Get(':id')
  @ApiOkResponse({ type: PublicJobViewDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<PublicJobView> {
    const job = await this.jobs.findPublished(id, new Date());
    if (!job) throw new NotFoundException({ code: 'not_found', title: 'Job offer not found' });
    return job;
  }
}
