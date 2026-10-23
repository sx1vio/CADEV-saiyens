import { createHash } from 'node:crypto';
import { Controller, Get, Inject, NotFoundException, Param, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import sharp from 'sharp';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { type CardLang, renderProofCard } from '../domain/proof-card';
import { PassportReader } from '../infrastructure/passport.reader';

const HANDLE = /^[A-Za-z0-9-]{1,40}$/;

/**
 * PR5 : Proof Card, servie en og:image par l'aperçu de partage (/u/:handle) et téléchargeable
 * depuis le Passport. Hors du préfixe /api/v1 : Caddy route /og/* vers l'API (ADR-0012).
 */
@ApiExcludeController()
@Controller('og/u')
export class ProofCardController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly reader: PassportReader,
  ) {}

  @Get(':file')
  async card(
    @Param('file') file: string,
    @Query('lang') langParam: string | undefined,
    @Query('download') download: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const handle = file.endsWith('.png') ? file.slice(0, -4) : '';
    const passport = HANDLE.test(handle) ? await this.reader.byHandle(handle) : null;
    if (!passport) throw new NotFoundException({ code: 'not_found', title: 'Passport not found' });

    const lang: CardLang = langParam === 'en' ? 'en' : 'fr';
    const svg = renderProofCard(passport, lang, new URL(this.env.APP_URL).host);
    // Même contenu, même image : l'empreinte du SVG sert d'ETag (aucun rendu inutile côté client).
    const etag = `"card-${createHash('sha256').update(svg).digest('hex').slice(0, 32)}"`;
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    if (download === '1') {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="devhub-${passport.user.handle}.png"`,
      );
    }
    res.type('image/png').send(png);
  }
}
