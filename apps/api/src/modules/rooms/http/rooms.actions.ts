import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  type OnModuleInit,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CreateRoomRequest,
  DecideJoinRequest,
  type DecideJoinResponse,
  JoinRoomRequest,
  type JoinRoomResponse,
} from '@devhub/contracts';
import { z } from 'zod';
import {
  type ActionDefinition,
  ActionRegistry,
} from '../../../infrastructure/actions/action-registry';
import type { Tx, WriteResult } from '../../../infrastructure/idempotency/idempotency.service';
import { Rooms } from '../application/rooms';
import {
  AlreadyMemberError,
  GithubNotLinkedError,
  GithubUnavailableError,
  JoinRequestDecidedError,
  JoinRequestNotFoundError,
  NotRoomManagerError,
  RepoNotFoundError,
  RepoNotOwnedError,
  RepoPrivateError,
  RoomNotFoundError,
  UnknownStackError,
} from '../domain/room';
import { PrismaRoomWriter } from '../infrastructure/prisma-room.writer';

/** Traduction des erreurs métier des salles en codes stables. */
export function toHttp(err: unknown): never {
  if (err instanceof RoomNotFoundError || err instanceof JoinRequestNotFoundError) {
    throw new NotFoundException({ code: 'not_found', title: 'Room or request not found' });
  }
  if (err instanceof RepoNotFoundError) {
    throw new UnprocessableEntityException({
      code: 'room.repo_not_found',
      title: 'GitHub repository not found',
    });
  }
  if (err instanceof RepoPrivateError) {
    throw new UnprocessableEntityException({
      code: 'room.repo_private',
      title: 'The repository must be public',
    });
  }
  if (err instanceof RepoNotOwnedError) {
    throw new ForbiddenException({
      code: 'room.repo_not_owned',
      title: 'You need write access to this repository to link it',
    });
  }
  if (err instanceof GithubNotLinkedError) {
    throw new UnprocessableEntityException({
      code: 'github.not_linked',
      title: 'No GitHub account linked',
    });
  }
  if (err instanceof GithubUnavailableError) {
    throw new ServiceUnavailableException({
      code: 'github.unavailable',
      title: 'GitHub is unavailable, retry later',
    });
  }
  if (err instanceof UnknownStackError) {
    throw new UnprocessableEntityException({
      code: 'question.tags_unknown',
      title: 'Unknown tags',
      errors: err.slugs.map((slug) => ({
        path: 'stackTagSlugs',
        code: 'unknown_tag',
        params: { slug },
      })),
    });
  }
  if (err instanceof AlreadyMemberError) {
    throw new ConflictException({
      code: 'room.already_member',
      title: 'Already a member of this room',
    });
  }
  if (err instanceof JoinRequestDecidedError) {
    throw new ConflictException({ code: 'conflict', title: 'This request was already decided' });
  }
  if (err instanceof NotRoomManagerError) {
    throw new ForbiddenException({ code: 'forbidden', title: 'Only the room owner can do this' });
  }
  throw err;
}

const JoinPayload = JoinRoomRequest.extend({ roomId: z.uuid() });
const DecidePayload = DecideJoinRequest.extend({ requestId: z.uuid() });
const CreateRoomPayload = CreateRoomRequest.extend({
  repo: z.object({ fullName: z.string(), htmlUrl: z.string() }).nullable(),
});
export type CreateRoomPayload = z.infer<typeof CreateRoomPayload>;

/** Écritures des salles. La création exige le réseau (vérification GitHub) : hors de /sync. */
@Injectable()
export class RoomsActions implements OnModuleInit {
  constructor(
    private readonly registry: ActionRegistry,
    private readonly rooms: Rooms,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.joinCreate);
  }

  /** R1 : le dépôt a déjà été vérifié hors transaction ; seul le corps de la requête est haché. */
  readonly roomCreate: ActionDefinition<CreateRoomPayload> = {
    type: 'room.create',
    schema: CreateRoomPayload,
    endpoint: () => 'POST /rooms',
    body: ({ repo: _repo, ...request }) => request,
    execute: async (
      tx: Tx,
      userId: string,
      p: CreateRoomPayload,
    ): Promise<WriteResult<{ id: string; code: string }>> => {
      try {
        const room = await this.rooms.create(new PrismaRoomWriter(tx), tx, {
          ownerId: userId,
          name: p.name,
          description: p.description,
          state: p.state,
          visibility: p.visibility,
          repo: p.repo,
          demoUrl: p.demoUrl ?? null,
          stackTagSlugs: p.stackTagSlugs,
        });
        return { status: HttpStatus.CREATED, body: { id: room.id, code: room.inviteCode } };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  readonly joinCreate: ActionDefinition<z.infer<typeof JoinPayload>> = {
    type: 'join_request.create',
    schema: JoinPayload,
    endpoint: (p) => `POST /rooms/${p.roomId}/join`,
    body: ({ roomId: _r, ...rest }) => rest,
    execute: async (tx, userId, p): Promise<WriteResult<JoinRoomResponse>> => {
      try {
        const { request, created } = await this.rooms.requestJoin(new PrismaRoomWriter(tx), tx, {
          roomId: p.roomId,
          userId,
          message: p.message ?? null,
        });
        return {
          status: created ? HttpStatus.CREATED : HttpStatus.OK,
          body: { id: request.id, roomId: request.roomId, status: request.status },
        };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  readonly joinDecide: ActionDefinition<z.infer<typeof DecidePayload>> = {
    type: 'join_request.decide',
    schema: DecidePayload,
    endpoint: (p) => `POST /join-requests/${p.requestId}/decide`,
    body: ({ requestId: _r, ...rest }) => rest,
    execute: async (tx, userId, p): Promise<WriteResult<DecideJoinResponse>> => {
      try {
        const { request, decidedAt } = await this.rooms.decide(new PrismaRoomWriter(tx), tx, {
          requestId: p.requestId,
          actorId: userId,
          decision: p.decision,
        });
        return {
          status: HttpStatus.OK,
          body: {
            id: request.id,
            roomId: request.roomId,
            status: request.status,
            decidedAt: decidedAt.toISOString(),
          },
        };
      } catch (err) {
        return toHttp(err);
      }
    },
  };
}
