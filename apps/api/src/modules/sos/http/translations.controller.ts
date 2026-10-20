import {
  BadGatewayException,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { type TranslatableType, TranslateQuery, TranslationResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { TranslateContent } from '../../ai';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';

class TranslateQueryDto extends createZodDto(TranslateQuery) {}
class TranslationResponseDto extends createZodDto(TranslationResponse) {}

/**
 * S10 : pont bilingue. Traduction IA à la demande, mise en cache par contenu et par langue.
 * Pas d'Idempotency-Key exigée : rejouer la demande relit la traduction en cache, sans effet de bord.
 */
@Controller('api/v1')
@UseGuards(SessionGuard)
export class TranslationsController {
  constructor(private readonly translate: TranslateContent) {}

  @Post('questions/:id/translate')
  @HttpCode(200)
  @ApiOkResponse({ type: TranslationResponseDto })
  question(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TranslateQueryDto,
  ): Promise<TranslationResponse> {
    return this.run('question', id, query, auth);
  }

  @Post('answers/:id/translate')
  @HttpCode(200)
  @ApiOkResponse({ type: TranslationResponseDto })
  answer(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TranslateQueryDto,
  ): Promise<TranslationResponse> {
    return this.run('answer', id, query, auth);
  }

  private async run(
    type: TranslatableType,
    id: string,
    query: TranslateQuery,
    auth: AuthenticatedUser,
  ): Promise<TranslationResponse> {
    const outcome = await this.translate.execute({
      type,
      id,
      target: query.lang,
      requesterId: auth.userId,
    });
    switch (outcome.kind) {
      case 'translated':
        return {
          contentType: type,
          contentId: id,
          lang: query.lang,
          title: outcome.text.title,
          body: outcome.text.body,
          cached: outcome.cached,
          demo: outcome.demo,
          createdAt: outcome.createdAt.toISOString(),
        };
      case 'not_found':
        throw new NotFoundException({ code: 'not_found', title: 'Content not found' });
      case 'same_language':
        throw new UnprocessableEntityException({
          code: 'translation.same_language',
          title: 'Content is already in this language',
        });
      case 'quota':
        throw new HttpException(
          { code: 'ai.quota_exceeded', title: 'Hourly AI quota reached' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      case 'unavailable':
        throw new ServiceUnavailableException({ code: 'ai.unavailable', title: 'AI is disabled' });
      case 'failed':
        throw new BadGatewayException({ code: 'translation.failed', title: 'Translation failed' });
    }
  }
}
