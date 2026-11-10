import {
  BadGatewayException,
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ReadNews } from '../application/read-news';
import { ImageProxy } from '../infrastructure/image-proxy';

const ListQuery = z.object({
  category: z.string().max(20).optional(),
  kind: z
    .enum(['article', 'video', 'hn', 'devto', 'repo', 'release', 'job', 'cert', 'skill'])
    .optional(),
  lang: z.enum(['fr', 'en', 'all']).optional(),
  q: z.string().max(80).optional(),
  before: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
class ListQueryDto extends createZodDto(ListQuery) {}

class HomeQueryDto extends createZodDto(
  z.object({ lang: z.enum(['fr', 'en', 'all']).optional() }),
) {}

class ImageQueryDto extends createZodDto(
  z.object({ u: z.url().max(2000), w: z.coerce.number().int().min(1).max(4000).optional() }),
) {}

// Actualités réelles agrégées (IA, tech, mobile, dev, vidéos YouTube, Hacker News, GitHub).
// Routes publiques, en lecture seule ; la collecte tourne dans le worker (job news.ingest).
@Controller('api/v1')
export class NewsController {
  constructor(
    private readonly read: ReadNews,
    @Inject(ImageProxy) private readonly images: ImageProxy,
  ) {}

  @Get('news/home')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600')
  home(@Query() q: HomeQueryDto) {
    return this.read.home(q.lang);
  }

  @Get('news')
  @Header('Cache-Control', 'public, max-age=120')
  async list(@Query() q: ListQueryDto) {
    return { items: await this.read.list(q) };
  }

  /** Détail d'un élément (offre d'emploi lue sur DevHub sans quitter le site). */
  @Get('news/item/:id')
  @Header('Cache-Control', 'public, max-age=300')
  async item(@Param('id') id: string) {
    const item = /^[0-9a-f]{24}$/.test(id) ? await this.read.get(id) : null;
    if (!item) throw new NotFoundException({ code: 'not_found', title: 'Item not found' });
    return item;
  }

  @Get('videos')
  @Header('Cache-Control', 'public, max-age=300')
  async videos(@Query() q: ListQueryDto) {
    return { items: await this.read.list({ ...q, kind: 'video' }) };
  }

  @Get('news/sources')
  async sources() {
    return { sources: await this.read.sources() };
  }

  @Get('news/status')
  status() {
    return this.read.status();
  }

  /** Image d'article redimensionnée en WebP (économie de data, aucune requête vers des tiers). */
  @Get('img')
  async image(@Query() q: ImageQueryDto, @Res() res: Response): Promise<void> {
    let body: Buffer;
    try {
      body = await this.images.get(q.u, q.w);
    } catch {
      res.setHeader('Cache-Control', 'public, max-age=600');
      throw new BadGatewayException({ code: 'image.unavailable', title: 'Image unavailable' });
    }
    res
      .setHeader('Cache-Control', 'public, max-age=604800, immutable')
      .type('image/webp')
      .send(body);
  }
}
