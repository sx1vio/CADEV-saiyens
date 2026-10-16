import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { GoSystalinkQuery, SystalinkEcosystemResponse } from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { type AuthenticatedUser, OptionalSessionGuard, OptionalUser } from '../../identity';
import { systalinkUrl } from '../domain/referral';
import { EcosystemReader } from '../infrastructure/ecosystem.reader';

class GoSystalinkQueryDto extends createZodDto(GoSystalinkQuery) {}
class SystalinkEcosystemResponseDto extends createZodDto(SystalinkEcosystemResponse) {}

// Idées A et B : DevHub au service de Systalink. Public, sans compte.
@Controller('api/v1')
export class SystalinkController {
  constructor(private readonly reader: EcosystemReader) {}

  /** B : compte le renvoi, puis redirige vers Systalink (liste fermée de destinations). */
  @Get('go/systalink')
  @UseGuards(OptionalSessionGuard)
  @Header('Cache-Control', 'no-store')
  async go(
    @Query() query: GoSystalinkQueryDto,
    @OptionalUser() viewer: AuthenticatedUser | null,
    @Res() res: Response,
  ): Promise<void> {
    const { repoUrl } = await this.reader.record({
      target: query.to,
      source: query.from,
      roomCode: query.room,
      userId: viewer?.userId ?? null,
    });
    res.redirect(302, systalinkUrl(query.to, query.from, repoUrl));
  }

  /** A et B : renvois, salles en production chez Systalink et vitrine. */
  @Get('systalink/ecosystem')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOkResponse({ type: SystalinkEcosystemResponseDto })
  ecosystem(): Promise<SystalinkEcosystemResponse> {
    return this.reader.ecosystem();
  }
}
