import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { SyncRequest, SyncResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { SyncBatch } from '../infrastructure/sync-batch';

class SyncRequestDto extends createZodDto(SyncRequest) {}
class SyncResponseDto extends createZodDto(SyncResponse) {}

/** 6 lots par minute et par utilisateur (06-api.md § Limitation du débit). */
const BATCHES_PER_MINUTE = 6;
const WINDOW_MS = 60_000;

@Controller('api/v1/sync')
@UseGuards(SessionGuard)
export class SyncController {
  private readonly recent = new Map<string, number[]>();

  constructor(private readonly batch: SyncBatch) {}

  /**
   * O2 : réception par lot de la file d'attente hors ligne. Chaque action porte son opId comme
   * clé d'idempotence : le lot peut être renvoyé sans doublon.
   */
  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: SyncResponseDto })
  async sync(
    @CurrentUser() auth: AuthenticatedUser,
    @Body() body: SyncRequestDto,
  ): Promise<SyncResponse> {
    this.throttle(auth.userId);
    const results = await this.batch.run(auth.userId, body.actions);
    return { results, serverTime: new Date().toISOString() };
  }

  private throttle(userId: string): void {
    const now = Date.now();
    const window = (this.recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
    if (window.length >= BATCHES_PER_MINUTE) {
      const retryAfter = Math.ceil((window[0]! + WINDOW_MS - now) / 1000);
      throw new HttpException(
        { code: 'rate_limited', title: 'Too many sync batches', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    window.push(now);
    this.recent.set(userId, window);
  }
}
