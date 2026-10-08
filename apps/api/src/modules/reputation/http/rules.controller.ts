import { SCORING, XP_LIMITS, XP_POINTS } from '@devhub/core';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { type XpRulesResponse, XpRulesResponseDto } from './dto';

// X5 : les règles publiées sont exactement celles qu'applique l'API (une seule source : @devhub/core).
@Controller('api/v1/rules')
export class RulesController {
  @Get('xp')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOkResponse({ type: XpRulesResponseDto })
  xp(): XpRulesResponse {
    return {
      points: { ...XP_POINTS },
      limits: { ...XP_LIMITS, uncappedKinds: [...XP_LIMITS.uncappedKinds] },
      scoring: {
        githubPerRepo: SCORING.githubPerRepo,
        githubCap: SCORING.githubCap,
        platformCap: SCORING.platformCap,
        activeMonths: SCORING.activeMonths,
        minLanguageShare: SCORING.minLanguageShare,
      },
    };
  }
}
