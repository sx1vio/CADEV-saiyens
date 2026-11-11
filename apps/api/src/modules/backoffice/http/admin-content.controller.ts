import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  AdminNewsInput,
  type AdminNewsItem,
  type AdminNewsListResponse,
  type AdminNewsPreview,
  AdminNewsPreviewRequest,
  AdminNewsQuery,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newsId } from '../../news';
import { SafeFetcher } from '../../preflight';
import { parseLinkPreview } from '../domain/link-preview';
import { type AdminRequest, AdminSessionGuard } from './admin-session.guard';

class AdminNewsQueryDto extends createZodDto(AdminNewsQuery) {}
class AdminNewsInputDto extends createZodDto(AdminNewsInput) {}
class AdminNewsPreviewRequestDto extends createZodDto(AdminNewsPreviewRequest) {}

/** Contenus ajoutés à la main : leur source, distincte de toutes les sources collectées. */
export const EDITORIAL_SOURCE = 'devhub';

const ID = /^[0-9a-f]{24}$/;

type Row = {
  id: string;
  kind: string;
  source: string;
  sourceName: string;
  category: string;
  lang: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  publishedAt: Date;
  hiddenAt: Date | null;
  curatedAt: Date | null;
};

const toItem = (r: Row): AdminNewsItem => ({
  id: r.id,
  kind: r.kind as AdminNewsItem['kind'],
  source: r.source,
  sourceName: r.sourceName,
  category: r.category,
  lang: r.lang === 'fr' ? 'fr' : 'en',
  title: r.title,
  summary: r.summary,
  url: r.url,
  image: r.image,
  publishedAt: r.publishedAt.toISOString(),
  hidden: r.hiddenAt !== null,
  curated: r.curatedAt !== null,
});

const notFound = () => new NotFoundException({ code: 'not_found', title: 'Content not found' });

function checkId(id: string): string {
  if (!ID.test(id)) throw notFound();
  return id;
}

/**
 * Contenus de la plateforme depuis l'administration (11/11/2026) : actualités, vidéos, skills IA,
 * dépôts, versions, certifications et offres collectés. Ajout à partir d'un lien (aperçu lu sur la
 * page), modification, retrait et remise en ligne. Un contenu ajouté ou modifié ici n'est plus
 * réécrit par la collecte ; un contenu retiré ne revient pas. Chaque action va au journal.
 */
@ApiExcludeController()
@Controller('api/v1/admin/news')
@UseGuards(AdminSessionGuard)
export class AdminContentController {
  constructor(private readonly prisma: PrismaService) {}

  /** Journal : la cible d'admin_actions est un UUID ; l'identifiant du contenu va dans le motif. */
  private audit(adminId: string, action: string, newsItemId: string, title = '') {
    return this.prisma.adminAction.create({
      data: {
        adminId,
        action,
        targetType: 'news',
        targetId: adminId,
        reason: `${newsItemId} · ${title}`.slice(0, 500),
      },
    });
  }

  @Get()
  async list(@Query() q: AdminNewsQueryDto): Promise<AdminNewsListResponse> {
    const where: Prisma.NewsItemWhereInput = {
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.state === 'visible' ? { hiddenAt: null } : {}),
      ...(q.state === 'hidden' ? { hiddenAt: { not: null } } : {}),
      ...(q.state === 'curated' ? { curatedAt: { not: null } } : {}),
      ...(q.q
        ? {
            OR: [
              { title: { contains: q.q, mode: 'insensitive' } },
              { url: { contains: q.q, mode: 'insensitive' } },
              { sourceName: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.newsItem.findMany({
        where,
        orderBy: [{ curatedAt: { sort: 'desc', nulls: 'last' } }, { publishedAt: 'desc' }],
        take: q.limit,
        skip: q.offset,
      }),
      this.prisma.newsItem.count({ where }),
    ]);
    return { data: rows.map(toItem), total };
  }

  /** Lit la page du lien (anti-SSRF, 600 Ko au plus) et propose titre, résumé, image, site, date. */
  @Post('preview')
  @HttpCode(200)
  async preview(@Body() body: AdminNewsPreviewRequestDto): Promise<AdminNewsPreview> {
    const fetcher = new SafeFetcher(AbortSignal.timeout(15_000));
    const page = await fetcher
      .get(body.url, {
        maxBytes: 600_000,
        timeoutMs: 12_000,
        headers: { Accept: 'text/html,application/xhtml+xml' },
      })
      .catch(() => null);
    if (!page || page.status >= 400) {
      throw new UnprocessableEntityException({
        code: 'news.preview_failed',
        title: 'The page could not be read',
      });
    }
    const finalUrl = page.url || body.url;
    const p = parseLinkPreview(page.body.toString('utf8'), finalUrl);
    const existing = await this.prisma.newsItem.findFirst({
      where: { url: { in: [body.url, finalUrl] } },
      select: { id: true },
    });
    return { url: body.url, ...p, existingId: existing?.id ?? null };
  }

  /** Ajoute un contenu ; si le lien existe déjà (collecté), il est remplacé et protégé. */
  @Post()
  async create(@Body() body: AdminNewsInputDto, @Req() req: AdminRequest): Promise<AdminNewsItem> {
    const now = new Date();
    const fields = {
      kind: body.kind,
      category: body.category,
      lang: body.lang,
      title: body.title,
      summary: body.summary,
      image: body.image,
      sourceName: body.sourceName,
      curatedAt: now,
      hiddenAt: null,
    };
    const row = await this.prisma.newsItem.upsert({
      where: { url: body.url },
      create: {
        ...fields,
        id: newsId(body.url),
        url: body.url,
        source: EDITORIAL_SOURCE,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : now,
      },
      update: {
        ...fields,
        ...(body.publishedAt ? { publishedAt: new Date(body.publishedAt) } : {}),
      },
    });
    await this.audit(req.admin!.userId, 'news_create', row.id, body.title);
    return toItem(row);
  }

  @Put(':id')
  async update(
    @Param('id') raw: string,
    @Body() body: AdminNewsInputDto,
    @Req() req: AdminRequest,
  ): Promise<AdminNewsItem> {
    const id = checkId(raw);
    const current = await this.prisma.newsItem.findUnique({ where: { id }, select: { url: true } });
    if (!current) throw notFound();
    if (body.url !== current.url) {
      if (await this.prisma.newsItem.findUnique({ where: { url: body.url }, select: { id: true } }))
        throw new ConflictException({ code: 'news.url_taken', title: 'This link already exists' });
    }
    const row = await this.prisma.newsItem.update({
      where: { id },
      data: {
        url: body.url,
        kind: body.kind,
        category: body.category,
        lang: body.lang,
        title: body.title,
        summary: body.summary,
        image: body.image,
        sourceName: body.sourceName,
        ...(body.publishedAt ? { publishedAt: new Date(body.publishedAt) } : {}),
        curatedAt: new Date(),
      },
    });
    await this.audit(req.admin!.userId, 'news_update', id, body.title);
    return toItem(row);
  }

  /** Retire un contenu partout ; la collecte ne le remet pas en ligne. */
  @Post(':id/hide')
  @HttpCode(200)
  async hide(@Param('id') raw: string, @Req() req: AdminRequest): Promise<AdminNewsItem> {
    return this.setHidden(checkId(raw), new Date(), req, 'news_hide');
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(@Param('id') raw: string, @Req() req: AdminRequest): Promise<AdminNewsItem> {
    return this.setHidden(checkId(raw), null, req, 'news_restore');
  }

  /**
   * Supprime un contenu ajouté à la main. Un contenu collecté reviendrait à la collecte suivante :
   * on le retire (hide) à la place.
   */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') raw: string, @Req() req: AdminRequest): Promise<void> {
    const id = checkId(raw);
    const row = await this.prisma.newsItem.findUnique({
      where: { id },
      select: { source: true, title: true },
    });
    if (!row) throw notFound();
    if (row.source !== EDITORIAL_SOURCE) {
      throw new BadRequestException({
        code: 'news.collected',
        title: 'Collected content comes back at the next run: hide it instead',
      });
    }
    await this.prisma.newsItem.delete({ where: { id } });
    await this.audit(req.admin!.userId, 'news_delete', id, row.title);
  }

  private async setHidden(id: string, at: Date | null, req: AdminRequest, action: string) {
    const { count } = await this.prisma.newsItem.updateMany({
      where: { id },
      data: { hiddenAt: at },
    });
    if (!count) throw notFound();
    await this.audit(req.admin!.userId, action, id);
    return toItem(await this.prisma.newsItem.findUniqueOrThrow({ where: { id } }));
  }
}
