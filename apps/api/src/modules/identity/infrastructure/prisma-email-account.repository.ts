import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  EmailAccount,
  EmailAccountRepository,
  ExistingAccount,
  NewEmailAccount,
} from '../domain/ports';

@Injectable()
export class PrismaEmailAccountRepository implements EmailAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  // `email` est en citext : la recherche ignore la casse
  async findByEmail(email: string): Promise<EmailAccount | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, handle: true, passwordHash: true },
    });
    return user ? { userId: user.id, handle: user.handle, passwordHash: user.passwordHash } : null;
  }

  async isHandleTaken(handle: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { handle } })) > 0;
  }

  async createWithPassword(a: NewEmailAccount): Promise<ExistingAccount | null> {
    const user = await this.prisma.user
      .create({
        data: {
          handle: a.handle,
          displayName: a.displayName,
          email: a.email,
          // Pas encore de lien de confirmation : l'adresse est déclarée, pas vérifiée
          emailVerified: false,
          passwordHash: a.passwordHash,
          lastSeenAt: a.now,
        },
        select: { id: true, handle: true },
      })
      // P2002 : une inscription simultanée a pris l'adresse ou le pseudo entre-temps
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002') return null;
        throw err;
      });
    return user && { userId: user.id, handle: user.handle };
  }

  async touch(userId: string, now: Date): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: now } });
  }
}
