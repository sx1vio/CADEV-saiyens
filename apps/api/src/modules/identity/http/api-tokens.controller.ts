import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  ListApiTokensResponse,
  MAX_API_TOKENS,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { PrismaApiTokenStore } from '../infrastructure/prisma-api-token.store';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from './session.guard';

class CreateApiTokenRequestDto extends createZodDto(CreateApiTokenRequest) {}
class CreateApiTokenResponseDto extends createZodDto(CreateApiTokenResponse) {}
class ListApiTokensResponseDto extends createZodDto(ListApiTokensResponse) {}

/** Jetons d'API personnels : gérés uniquement avec une session (un jeton n'en crée pas d'autre). */
@Controller('api/v1/me/tokens')
@UseGuards(SessionGuard)
export class ApiTokensController {
  constructor(private readonly tokens: PrismaApiTokenStore) {}

  @Get()
  @ApiOkResponse({ type: ListApiTokensResponseDto })
  async list(@CurrentUser() auth: AuthenticatedUser): Promise<ListApiTokensResponse> {
    return { items: await this.tokens.list(auth.userId) };
  }

  @Post()
  @ApiOkResponse({ type: CreateApiTokenResponseDto })
  async create(
    @CurrentUser() auth: AuthenticatedUser,
    @Body() body: CreateApiTokenRequestDto,
  ): Promise<CreateApiTokenResponse> {
    if ((await this.tokens.count(auth.userId)) >= MAX_API_TOKENS) {
      throw new UnprocessableEntityException({
        code: 'api_token.limit',
        title: `At most ${MAX_API_TOKENS} API tokens`,
      });
    }
    return this.tokens.create(auth.userId, body.name, body.scope);
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    if (!(await this.tokens.revoke(auth.userId, id))) {
      throw new NotFoundException({ code: 'not_found', title: 'API token not found' });
    }
  }
}
