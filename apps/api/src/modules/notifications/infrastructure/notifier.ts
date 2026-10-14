import { Injectable } from '@nestjs/common';
import type { NotificationType } from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { publishToUsers } from '../../../infrastructure/realtime/realtime.publisher';

export interface NewNotification {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
}

/**
 * API publique du module notifications : les autres modules créent leurs notifications dans
 * leur propre transaction (jamais de notification sans l'action, ni l'inverse). La diffusion
 * temps réel (SSE, Y8) et l'e-mail (Y3) liront cette même table.
 */
@Injectable()
export class Notifier {
  constructor(private readonly prisma: PrismaService) {}

  async notify(notifications: NewNotification[], tx?: unknown): Promise<void> {
    if (notifications.length === 0) return;
    const db = (tx as Prisma.TransactionClient | undefined) ?? this.prisma;
    await db.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        payload: n.payload as Prisma.InputJsonValue,
      })),
    });
    // Y8 : NOTIFY délivré au COMMIT de la même transaction.
    await publishToUsers(
      db,
      notifications.map((n) => n.userId),
    );
  }
}
