import {
  Controller,
  ForbiddenException,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { ClaimResponse } from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { ClaimQuestion, NotSolicitedError } from '../application/run-wave';

class ClaimResponseDto extends createZodDto(ClaimResponse) {}

@Controller('api/v1/questions')
@UseGuards(SessionGuard)
export class ClaimController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly claimQuestion: ClaimQuestion,
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
    const outcome = await this.idempotency
      .run(
        { userId: auth.userId, key, endpoint: `POST /questions/${questionId}/claim`, body: {} },
        async (tx) => {
          const { claimedAt } = await this.claimQuestion.execute(questionId, auth.userId, tx);
          return { status: 200, body: { questionId, claimedAt: claimedAt.toISOString() } };
        },
      )
      .catch((err: unknown) => {
        if (err instanceof NotSolicitedError) {
          throw new ForbiddenException({
            code: 'forbidden',
            title: 'Only a solicited helper can claim an open question',
          });
        }
        throw err;
      });
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body;
  }
}
