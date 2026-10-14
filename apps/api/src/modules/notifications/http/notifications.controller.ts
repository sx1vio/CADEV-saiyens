import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  ListNotificationsQuery,
  ListNotificationsResponse,
  type NotificationType,
  ReadNotificationsRequest,
  ReadNotificationsResponse,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { afterCursor, decodeCursor, encodeCursor } from '../../../infrastructure/http/cursor';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';

class ListNotificationsQueryDto extends createZodDto(ListNotificationsQuery) {}
class ListNotificationsResponseDto extends createZodDto(ListNotificationsResponse) {}
class ReadNotificationsRequestDto extends createZodDto(ReadNotificationsRequest) {}
class ReadNotificationsResponseDto extends createZodDto(ReadNotificationsResponse) {}

@Controller('api/v1/notifications')
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
  ) {}

  /** Mes notifications, les plus récentes d'abord, avec le nombre de non lues. */
  @Get()
  @ApiOkResponse({ type: ListNotificationsResponseDto })
  async list(
    @CurrentUser() auth: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponse> {
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId: auth.userId,
          ...(query.unread ? { readAt: null } : {}),
          ...afterCursor(decodeCursor(query.cursor)),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      }),
      this.prisma.notification.count({ where: { userId: auth.userId, readAt: null } }),
    ]);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    const hasMore = rows.length > query.limit;
    return {
      data: page.map((n) => ({
        id: n.id,
        type: n.type as NotificationType,
        payload: n.payload as Record<string, unknown>,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ at: last.createdAt.toISOString(), id: last.id }) : null,
      },
    };
  }

  /** Marquer comme lues : une liste d'identifiants, ou toutes. */
  @Post('read')
  @HttpCode(200)
  @ApiOkResponse({ type: ReadNotificationsResponseDto })
  async read(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Body() body: ReadNotificationsRequestDto,
  ): Promise<ReadNotificationsResponse> {
    const outcome = await this.idempotency.run(
      { userId: auth.userId, key, endpoint: 'POST /notifications/read', body },
      async (tx) => {
        const { count } = await tx.notification.updateMany({
          where: {
            userId: auth.userId,
            readAt: null,
            ...(body.ids ? { id: { in: body.ids } } : {}),
          },
          data: { readAt: new Date() },
        });
        return { status: 200, body: { updated: count } };
      },
    );
    return outcome.body;
  }
}
