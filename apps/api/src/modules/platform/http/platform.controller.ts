import { Controller, Get, Header, Inject } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { ImpactResponse, StatusResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import type { StatusStore } from '../domain/ports';
import { summarize } from '../domain/status';
import { ImpactReader } from '../infrastructure/impact.reader';
import { STATUS_STORE } from '../tokens';

class StatusResponseDto extends createZodDto(StatusResponse) {}
class ImpactResponseDto extends createZodDto(ImpactResponse) {}

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

  /** Y2 : devs inscrits, questions résolues, temps médian de première réponse humaine. */
  @Get('impact')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOkResponse({ type: ImpactResponseDto })
  impact(): Promise<ImpactResponse> {
    return this.impactReader.impact();
  }
}
