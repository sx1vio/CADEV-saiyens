import {
  BadRequestException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { ListPreflightLabelsResponse, PreflightLabel } from '@devhub/contracts';
import { labelBadge, PreflightLabels } from '../infrastructure/preflight-labels';

class PreflightLabelDto extends createZodDto(PreflightLabel) {}
class ListPreflightLabelsResponseDto extends createZodDto(ListPreflightLabelsResponse) {}

const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{1,5})?$/;
const HANDLE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

function domainOf(raw: string): string {
  const d = raw.trim().toLowerCase();
  if (d.length > 253 || !DOMAIN.test(d)) {
    throw new BadRequestException({ code: 'validation.failed', title: 'Invalid domain' });
  }
  return d;
}

/**
 * Label « DevHub Ready » : lecture publique (page /label/:domaine, Passport) et badge SVG à
 * afficher dans un README. Aucune donnée privée : domaine, verdict, scores, auteur public.
 */
@Controller('api/v1/labels')
export class LabelsController {
  constructor(private readonly labels: PreflightLabels) {}

  @Get()
  @ApiOkResponse({ type: ListPreflightLabelsResponseDto })
  async list(@Query('owner') owner?: string): Promise<ListPreflightLabelsResponse> {
    if (!owner || !HANDLE.test(owner)) {
      throw new BadRequestException({ code: 'validation.failed', title: 'owner is required' });
    }
    return { items: await this.labels.listByOwner(owner) };
  }

  @Get(':domain/badge.svg')
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  async badge(@Param('domain') raw: string, @Res() res: Response): Promise<void> {
    const label = await Promise.resolve()
      .then(() => this.labels.get(domainOf(raw)))
      .catch(() => null);
    // Les README (GitHub passe par son proxy d'images) relisent le badge au plus toutes les heures.
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(labelBadge(label));
  }

  @Get(':domain')
  @ApiOkResponse({ type: PreflightLabelDto })
  async get(@Param('domain') raw: string): Promise<PreflightLabel> {
    const label = await this.labels.get(domainOf(raw));
    if (!label)
      throw new NotFoundException({ code: 'not_found', title: 'No label for this domain' });
    return label;
  }
}
