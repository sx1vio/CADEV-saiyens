import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { NewSession, SessionStore } from '../domain/ports';

export interface ActiveSession {
  idHash: string;
  userId: string;
  lastUsedAt: Date;
}

@Injectable()
export class PrismaSessionStore implements SessionStore {
  constructor(private readonly prisma: PrismaService) {}

  async create(s: NewSession): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: s.idHash,
        userId: s.userId,
        expiresAt: s.expiresAt,
        userAgent: s.userAgent?.slice(0, 512) ?? null,
        ipHash: s.ipHash,
      },
    });
  }

  /** Session non expirée d'un compte ni supprimé ni suspendu. */
  async findActive(idHash: string, now: Date): Promise<ActiveSession | null> {
    const session = await this.prisma.session.findFirst({
      where: { id: idHash, expiresAt: { gt: now }, user: { deletedAt: null, suspendedAt: null } },
      select: { id: true, userId: true, lastUsedAt: true },
    });
    return session
      ? { idHash: session.id, userId: session.userId, lastUsedAt: session.lastUsedAt }
      : null;
  }

  /** Prolonge la session (30 jours glissants) et met à jour la dernière activité (matching : actif < 30 j). */
  async touch(session: ActiveSession, now: Date, expiresAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: session.idHash },
        data: { lastUsedAt: now, expiresAt },
      }),
      this.prisma.user.update({ where: { id: session.userId }, data: { lastSeenAt: now } }),
    ]);
  }

  async revoke(idHash: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: idHash } });
  }

  /** Compte suspendu par l'administration : ferme ses sessions et le signale à la connexion. */
  async rejectIfSuspended(userId: string): Promise<boolean> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { suspendedAt: true },
    });
    if (!u?.suspendedAt) return false;
    await this.prisma.session.deleteMany({ where: { userId } });
    return true;
  }
}
