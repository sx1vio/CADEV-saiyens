import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  DiscoverDevsQuery,
  DiscoverDevsResponse,
  LeaderboardMapResponse,
  LeaderboardQuery,
  LeaderboardResponse,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { DiscoveryReader } from '../infrastructure/discovery.reader';

class DiscoverDevsQueryDto extends createZodDto(DiscoverDevsQuery) {}
class DiscoverDevsResponseDto extends createZodDto(DiscoverDevsResponse) {}
class LeaderboardQueryDto extends createZodDto(LeaderboardQuery) {}
class LeaderboardResponseDto extends createZodDto(LeaderboardResponse) {}
class LeaderboardMapResponseDto extends createZodDto(LeaderboardMapResponse) {}

// D1, D2 : découverte publique, sans compte. Les salles se cherchent avec GET /rooms.
@Controller('api/v1')
export class DiscoveryController {
  constructor(private readonly reader: DiscoveryReader) {}

  /** D1 : devs par stack, fuseau, disponibilité, objectif, pays (filtres combinables). */
  @Get('discover/devs')
  @ApiOkResponse({ type: DiscoverDevsResponseDto })
  devs(@Query() query: DiscoverDevsQueryDto): Promise<DiscoverDevsResponse> {
    return this.reader.devs(query);
  }

  /** D2 : classement par pays (ou devs d'un pays), calculé sur le journal des Proof XP. */
  @Get('leaderboard')
  @ApiOkResponse({ type: LeaderboardResponseDto })
  leaderboard(@Query() query: LeaderboardQueryDto): Promise<LeaderboardResponse> {
    return this.reader.leaderboard(query);
  }

  /** D4 : agrégats par pays pour la carte de l'Afrique (pays masqués et comptes de démo à part). */
  @Get('leaderboard/map')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOkResponse({ type: LeaderboardMapResponseDto })
  map(): Promise<LeaderboardMapResponse> {
    return this.reader.map();
  }
}
