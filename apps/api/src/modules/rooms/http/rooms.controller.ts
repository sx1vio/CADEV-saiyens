import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import {
  CreateRoomRequest,
  DecideJoinRequest,
  DecideJoinResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  ListJoinRequestsResponse,
  ListRoomsQuery,
  ListRoomsResponse,
  RoomDetail,
} from '@devhub/contracts';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { runAction } from '../../../infrastructure/actions/action-registry';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from '../../identity';
import { canManage } from '../domain/room';
import { GithubRepoVerifier } from '../infrastructure/github-repo.verifier';
import { RoomReader } from '../infrastructure/room.reader';
import { RoomsActions, toHttp } from './rooms.actions';

class CreateRoomRequestDto extends createZodDto(CreateRoomRequest) {}
class RoomDetailDto extends createZodDto(RoomDetail) {}
class ListRoomsQueryDto extends createZodDto(ListRoomsQuery) {}
class ListRoomsResponseDto extends createZodDto(ListRoomsResponse) {}
class JoinRoomRequestDto extends createZodDto(JoinRoomRequest) {}
class JoinRoomResponseDto extends createZodDto(JoinRoomResponse) {}
class DecideJoinRequestDto extends createZodDto(DecideJoinRequest) {}
class DecideJoinResponseDto extends createZodDto(DecideJoinResponse) {}
class ListJoinRequestsResponseDto extends createZodDto(ListJoinRequestsResponse) {}

@Controller('api/v1')
export class RoomsController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly reader: RoomReader,
    private readonly actions: RoomsActions,
    private readonly verifier: GithubRepoVerifier,
  ) {}

  /** D1, R1 : liste publique des salles, filtres et recherche. */
  @Get('rooms')
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: ListRoomsResponseDto })
  list(
    @Query() query: ListRoomsQueryDto,
    @OptionalUser() viewer: AuthenticatedUser | null,
  ): Promise<ListRoomsResponse> {
    return this.reader.list(query, viewer?.userId ?? null);
  }

  /** R1 : créer une salle, dépôt vérifié via GitHub. Exige le réseau (hors file hors ligne). */
  @Post('rooms')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: RoomDetailDto })
  async create(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Body() body: CreateRoomRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RoomDetail> {
    // Appel GitHub (jusqu'à 10 s) hors de la transaction, qui expire au bout de 5 s.
    const repo = body.repoFullName
      ? await this.verifier.verify(auth.userId, body.repoFullName).catch(toHttp)
      : null;
    const outcome = await runAction(this.idempotency, this.actions.roomCreate, auth.userId, key, {
      ...body,
      repo,
    });
    const { code } = outcome.body as { code: string };
    res.status(outcome.status);
    res.setHeader('Location', `/api/v1/rooms/${code}`);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return (await this.reader.detailByCode(code, auth.userId))!;
  }

  /** R1, R7 : fiche publique d'une salle par son code d'invitation. */
  @Get('rooms/:code')
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: RoomDetailDto })
  async detail(
    @Param('code') code: string,
    @OptionalUser() viewer: AuthenticatedUser | null,
  ): Promise<RoomDetail> {
    const room = /^[a-z0-9]{4,16}$/.test(code)
      ? await this.reader.detailByCode(code, viewer?.userId ?? null)
      : null;
    if (!room) throw new NotFoundException({ code: 'not_found', title: 'Room not found' });
    return room;
  }

  /** R3 : demander à rejoindre ; le créateur est notifié. */
  @Post('rooms/:id/join')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: JoinRoomResponseDto })
  async join(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) roomId: string,
    @Body() body: JoinRoomRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<JoinRoomResponse> {
    const outcome = await runAction(this.idempotency, this.actions.joinCreate, auth.userId, key, {
      ...body,
      roomId,
    });
    res.status(outcome.status);
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body as JoinRoomResponse;
  }

  /** R3 : demandes pour rejoindre, réservées au créateur et aux mainteneurs. */
  @Get('rooms/:id/join-requests')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ListJoinRequestsResponseDto })
  async joinRequests(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) roomId: string,
  ): Promise<ListJoinRequestsResponse> {
    if (!canManage(await this.reader.roleOf(roomId, auth.userId))) {
      throw new ForbiddenException({ code: 'forbidden', title: 'Only the room owner can do this' });
    }
    return { data: await this.reader.joinRequests(roomId) };
  }

  /** R3 : accepter ou refuser ; le demandeur est notifié. */
  @Post('join-requests/:id/decide')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: DecideJoinResponseDto })
  async decide(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() body: DecideJoinRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DecideJoinResponse> {
    const outcome = await runAction(this.idempotency, this.actions.joinDecide, auth.userId, key, {
      ...body,
      requestId,
    });
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    return outcome.body as DecideJoinResponse;
  }
}
