import { Controller, Get, Header } from '@nestjs/common';
import type { ActiveAnnouncementsResponse } from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/** Annonces publiées depuis l'administration, affichées en bandeau sur le site. */
@Controller('api/v1/announcements')
export class AnnouncementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  async active(): Promise<ActiveAnnouncementsResponse> {
    const now = new Date();
    const rows = await this.prisma.announcement.findMany({
      where: {
        active: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { startsAt: 'desc' },
      take: 3,
      select: { id: true, message: true, level: true, linkUrl: true, linkLabel: true },
    });
    return {
      data: rows.map((r) => ({
        ...r,
        level: r.level as ActiveAnnouncementsResponse['data'][number]['level'],
      })),
    };
  }
}
