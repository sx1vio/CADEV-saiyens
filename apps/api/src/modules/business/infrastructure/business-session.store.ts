import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/** Session recruteur : 14 jours glissants. */
export const BUSINESS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface ActiveBusinessSession {
  idHash: string;
  accountId: string;
  companyId: string;
  role: 'owner' | 'recruiter';
}

@Injectable()
export class BusinessSessionStore {
  constructor(private readonly prisma: PrismaService) {}

  async create(idHash: string, accountId: string, now: Date): Promise<Date> {
    const expiresAt = new Date(now.getTime() + BUSINESS_TTL_MS);
    await this.prisma.businessSession.create({ data: { id: idHash, accountId, expiresAt } });
    await this.prisma.businessAccount.update({
      where: { id: accountId },
      data: { lastLoginAt: now },
    });
    return expiresAt;
  }

  /** Session valide d'un compte actif dont l'entreprise n'est pas suspendue ; prolongée à l'usage. */
  async use(idHash: string, now: Date): Promise<ActiveBusinessSession | null> {
    const s = await this.prisma.businessSession.findFirst({
      where: {
        id: idHash,
        expiresAt: { gt: now },
        account: { disabledAt: null, company: { status: { not: 'suspended' } } },
      },
      select: { id: true, account: { select: { id: true, companyId: true, role: true } } },
    });
    if (!s) return null;
    await this.prisma.businessSession.update({
      where: { id: s.id },
      data: { lastUsedAt: now, expiresAt: new Date(now.getTime() + BUSINESS_TTL_MS) },
    });
    return {
      idHash: s.id,
      accountId: s.account.id,
      companyId: s.account.companyId,
      role: s.account.role as 'owner' | 'recruiter',
    };
  }

  async delete(idHash: string): Promise<void> {
    await this.prisma.businessSession.deleteMany({ where: { id: idHash } });
  }
}
