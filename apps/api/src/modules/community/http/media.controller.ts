import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
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
import { UploadMediaResponse } from '@devhub/contracts';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { MEDIA_MAX_BYTES, MEDIA_PER_DAY, parseSide, sniffImage } from '../domain/image';

class UploadMediaResponseDto extends createZodDto(UploadMediaResponse) {}

const DAY = 24 * 60 * 60 * 1000;
export const mediaUrl = (id: string) => `/api/v1/media/${id}`;

/** Lit le corps brut de la requête, en coupant au-delà de la limite. */
function readBody(req: Request, limit: number): Promise<Buffer | null> {
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

/**
 * Photos des publications (12/11/2026). Le navigateur réduit l'image (1 600 px, WebP) puis envoie
 * ses octets bruts ; on vérifie le format réel. Lecture publique, mise en cache un an : une photo
 * ne change jamais (une nouvelle photo a un nouvel identifiant).
 */
@Controller('api/v1/media')
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: UploadMediaResponseDto })
  async upload(
    @Req() req: Request,
    @Query('w') w: unknown,
    @Query('h') h: unknown,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<UploadMediaResponse> {
    const width = parseSide(w);
    const height = parseSide(h);
    if (!width || !height) {
      throw new UnprocessableEntityException({
        code: 'media.invalid_size',
        title: 'Width and height (w, h) are required',
      });
    }
    const recent = await this.prisma.media.count({
      where: { ownerId: auth.userId, createdAt: { gte: new Date(Date.now() - DAY) } },
    });
    if (recent >= MEDIA_PER_DAY) {
      throw new HttpException(
        { code: 'media.daily_limit', title: 'Daily upload limit reached' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const body = await readBody(req, MEDIA_MAX_BYTES);
    if (!body) {
      throw new HttpException(
        { code: 'media.too_large', title: 'Image larger than 2 MB' },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    const mime = sniffImage(body);
    if (!mime) {
      throw new UnprocessableEntityException({
        code: 'media.unsupported',
        title: 'Only JPEG, PNG and WebP images are accepted',
      });
    }
    const row = await this.prisma.media.create({
      data: { ownerId: auth.userId, mime, bytes: new Uint8Array(body), width, height },
      select: { id: true },
    });
    return { id: row.id, url: mediaUrl(row.id), width, height };
  }

  @Get(':id')
  async read(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { id },
      select: { mime: true, bytes: true },
    });
    if (!media) throw new NotFoundException({ code: 'not_found', title: 'Image not found' });
    res.setHeader('Content-Type', media.mime);
    res.setHeader('Content-Length', String(media.bytes.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.end(Buffer.from(media.bytes));
  }
}
