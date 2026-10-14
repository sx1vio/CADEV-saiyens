import { Controller, HttpCode, Param, ParseUUIDPipe, Post, Res, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { ClaimResponse } from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { runAction } from '../../../infrastructure/actions/action-registry';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { MatchingActions } from './matching.actions';

class ClaimResponseDto extends createZodDto(ClaimResponse) {}

@Controller('api/v1/questions')
@UseGuards(SessionGuard)
export class ClaimController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly actions: MatchingActions,
  ) {}

  /** S11 : « Je m'en occupe », réservé aux aidants sollicités. Retarde l'escalade de 20 minutes. */
  @Post(':id/claim')
  @HttpCode(200)
  @ApiOkResponse({ type: ClaimResponseDto })
  async claim(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) questionId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ClaimResponse> {
    const outcome = await runAction(
      this.idempotency,
      this.actions.questionClaim,
      auth.userId,
      key,
      {
        questionId,
      },
    );
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body as ClaimResponse;
  }
}
