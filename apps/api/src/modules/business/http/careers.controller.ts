import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { ApplyRequest, CompanyPublicView, type MyApplicationView } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { BusinessRepository } from '../infrastructure/business.repository';

class ApplyDto extends createZodDto(ApplyRequest) {}
class CompanyPublicViewDto extends createZodDto(CompanyPublicView) {}

const notFound = () => new NotFoundException({ code: 'not_found', title: 'Not found' });

// Côté devs : page publique des entreprises validées, candidature avec son Passport.
@Controller('api/v1')
export class CareersController {
  constructor(private readonly repo: BusinessRepository) {}

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
    const r = await this.repo.apply(id, auth.userId, body.message, new Date());
    if (r === 'not_found') throw notFound();
    if (r === 'already')
      throw new ConflictException({ code: 'application.exists', title: 'Already applied' });
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
