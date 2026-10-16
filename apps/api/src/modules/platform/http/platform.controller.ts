import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  ImpactResponse,
  StatusHistoryQuery,
  StatusHistoryResponse,
  StatusResponse,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import type { StatusStore } from '../domain/ports';
import { history, summarize } from '../domain/status';
import { ImpactReader } from '../infrastructure/impact.reader';
import { STATUS_STORE } from '../tokens';

class StatusResponseDto extends createZodDto(StatusResponse) {}
class ImpactResponseDto extends createZodDto(ImpactResponse) {}
class StatusHistoryQueryDto extends createZodDto(StatusHistoryQuery) {}
class StatusHistoryResponseDto extends createZodDto(StatusHistoryResponse) {}

// Écran /systalink (Y1) et écran d'impact (Y2) : public, sans compte.
@Controller('api/v1')
export class PlatformController {
  constructor(
    @Inject(STATUS_STORE) private readonly store: StatusStore,
    private readonly impactReader: ImpactReader,
  ) {}

  /** Y1 : état réel des services Systalink et date de la dernière sauvegarde. */
  @Get('status')
  @Header('Cache-Control', 'public, max-age=30')
  @ApiOkResponse({ type: StatusResponseDto })
  async status(): Promise<StatusResponse> {
    return summarize(await this.store.latest(), new Date());
  }

  /** Y5 : disponibilité par service et par jour, sur 7 jours par défaut (30 au plus). */
  @Get('status/history')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOkResponse({ type: StatusHistoryResponseDto })
  async statusHistory(@Query() query: StatusHistoryQueryDto): Promise<StatusHistoryResponse> {
    const now = new Date();
    const since = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (query.days - 1)),
    );
    return history(await this.store.dailyCounts(since), query.days, now);
  }

  /** Y2 : devs inscrits, questions résolues, temps médian de première réponse humaine. */
  @Get('impact')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOkResponse({ type: ImpactResponseDto })
  impact(): Promise<ImpactResponse> {
    return this.impactReader.impact();
  }
}
