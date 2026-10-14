import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { ListTagsResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

class ListTagsResponseDto extends createZodDto(ListTagsResponse) {}

// Référentiel public des étiquettes : quelques centaines de lignes, mis en cache par le navigateur.
@Controller('api/v1')
export class TagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tags')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOkResponse({ type: ListTagsResponseDto })
  async list(): Promise<ListTagsResponse> {
    const data = await this.prisma.tag.findMany({
      select: { slug: true, label: true, aliases: true },
      orderBy: { label: 'asc' },
    });
    return { data };
  }
}
