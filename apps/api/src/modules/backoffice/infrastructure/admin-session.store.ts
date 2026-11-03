import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/** 30 minutes sans activité ferment la session d'administration. */
export const ADMIN_IDLE_MS = 30 * 60 * 1000;
/** Une session d'administration ne dure jamais plus de 8 heures. */
export const ADMIN_MAX_MS = 8 * 60 * 60 * 1000;

export interface ActiveAdminSession {
  idHash: string;
  userId: string;
  expiresAt: Date;
  handle: string;
  displayName: string;
  role: 'super' | 'moderator';
}

@Injectable()
export class AdminSessionStore {
  constructor(private readonly prisma: PrismaService) {}

  async create(s: {
    idHash: string;
    userId: string;
    expiresAt: Date;
    userAgent: string | null;
    ipHash: string | null;
  }): Promise<void> {
    await this.prisma.adminSession.create({
      data: {
        id: s.idHash,
        userId: s.userId,
        expiresAt: s.expiresAt,
        userAgent: s.userAgent?.slice(0, 512) ?? null,
        ipHash: s.ipHash,
      },
    });
  }

  /**
   * Session valide : non expirée, active dans les 30 dernières minutes, et compte toujours
   * administrateur (le droit retiré par la CLI ferme aussitôt les sessions). Prolonge l'inactivité.
   */
  async use(idHash: string, now: Date): Promise<ActiveAdminSession | null> {
    const s = await this.prisma.adminSession.findFirst({
      where: {
        id: idHash,
        expiresAt: { gt: now },
        lastUsedAt: { gt: new Date(now.getTime() - ADMIN_IDLE_MS) },
        user: { isAdmin: true, deletedAt: null },
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        user: { select: { handle: true, displayName: true, adminRole: true } },
      },
    });
    if (!s) return null;
    await this.prisma.adminSession.update({ where: { id: s.id }, data: { lastUsedAt: now } });
    return {
      idHash: s.id,
      userId: s.userId,
      expiresAt: s.expiresAt,
      handle: s.user.handle,
      displayName: s.user.displayName,
      role: s.user.adminRole === 'moderator' ? 'moderator' : 'super',
    };
  }

  async delete(idHash: string): Promise<void> {
    await this.prisma.adminSession.deleteMany({ where: { id: idHash } });
  }

  /** Ménage : sessions expirées ou inactives. */
  async purge(now: Date): Promise<number> {
    const { count } = await this.prisma.adminSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { lastUsedAt: { lte: new Date(now.getTime() - ADMIN_IDLE_MS) } },
        ],
      },
    });
    return count;
  }
}
