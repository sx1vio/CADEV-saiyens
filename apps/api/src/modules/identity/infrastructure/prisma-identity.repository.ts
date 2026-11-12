import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  AccountRefresh,
  ExistingAccount,
  GithubLink,
  IdentityRepository,
  NewAccount,
} from '../domain/ports';

@Injectable()
export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByGithubId(githubId: bigint): Promise<ExistingAccount | null> {
    const user = await this.prisma.user.findFirst({
      where: { githubId, deletedAt: null },
      select: { id: true, handle: true },
    });
    return user ? { userId: user.id, handle: user.handle } : null;
  }

  async isHandleTaken(handle: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { handle } })) > 0;
  }

  async isEmailAvailable(email: string, exceptUserId?: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
    });
    return count === 0;
  }

  async create(a: NewAccount): Promise<ExistingAccount> {
    const user = await this.prisma.user.create({
      data: {
        handle: a.handle,
        displayName: a.displayName,
        avatarUrl: a.avatarUrl,
        email: a.email,
        emailVerified: a.email !== null,
        githubId: a.githubId,
        githubLogin: a.githubLogin,
        githubCreatedAt: a.githubCreatedAt,
        lastSeenAt: a.now,
        oauthAccounts: {
          create: {
            provider: 'github',
            providerAccountId: a.githubId.toString(),
            accessTokenEnc: Buffer.from(a.accessTokenEnc),
            scopes: a.scopes,
          },
        },
      },
      select: { id: true, handle: true },
    });
    return { userId: user.id, handle: user.handle };
  }

  async refresh(a: AccountRefresh): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: a.userId },
        data: {
          avatarUrl: a.avatarUrl,
          githubLogin: a.githubLogin,
          githubCreatedAt: a.githubCreatedAt,
          lastSeenAt: a.now,
          ...(a.email ? { email: a.email, emailVerified: true } : {}),
        },
        select: { githubId: true },
      });
      await tx.oAuthAccount.update({
        where: {
          provider_providerAccountId: {
            provider: 'github',
            providerAccountId: String(user.githubId),
          },
        },
        data: { accessTokenEnc: Buffer.from(a.accessTokenEnc), scopes: a.scopes },
      });
    });
  }

  async linkedGithubId(userId: string): Promise<bigint | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubId: true },
    });
    return user?.githubId ?? null;
  }

  async link(a: GithubLink): Promise<void> {
    const providerAccountId = a.githubId.toString();
    const token = { accessTokenEnc: Buffer.from(a.accessTokenEnc), scopes: a.scopes };
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: a.userId },
        select: { avatarUrl: true, email: true },
      });
      await tx.user.update({
        where: { id: a.userId },
        data: {
          githubId: a.githubId,
          githubLogin: a.githubLogin,
          githubCreatedAt: a.githubCreatedAt,
          lastSeenAt: a.now,
          ...(user.avatarUrl ? {} : { avatarUrl: a.avatarUrl }),
          ...(!user.email && a.email ? { email: a.email, emailVerified: true } : {}),
        },
      });
      await tx.oAuthAccount.upsert({
        where: { provider_providerAccountId: { provider: 'github', providerAccountId } },
        create: { userId: a.userId, provider: 'github', providerAccountId, ...token },
        update: token,
      });
    });
  }
}
