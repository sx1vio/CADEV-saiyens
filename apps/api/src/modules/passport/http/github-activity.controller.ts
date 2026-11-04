import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GithubActivityView } from '@devhub/contracts';
import { GithubActivityReader } from '../infrastructure/github-activity.reader';

// Activité GitHub publique sur le Passport : dépôts, commits récents, 90 derniers jours.
@Controller('api/v1/users')
export class GithubActivityController {
  constructor(private readonly reader: GithubActivityReader) {}

  @Get(':handle/github')
  @Header('Cache-Control', 'public, max-age=300')
  async activity(@Param('handle') handle: string): Promise<GithubActivityView> {
    const r = await this.reader.forHandle(handle.slice(0, 40));
    if (r.ok) return r.view;
    if (r.reason === 'not_found')
      throw new NotFoundException({ code: 'not_found', title: 'No public GitHub activity' });
    throw new ServiceUnavailableException({
      code: 'github.unavailable',
      title: 'GitHub is unavailable, try again later',
    });
  }
}
