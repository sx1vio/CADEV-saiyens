import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { API_TOKEN_PREFIX, type ApiTokenItem } from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { hashSessionToken } from '../application/session-token';

const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // dernière utilisation : précision d'une heure

/** Jeton d'API personnel : « dh_pat_ » + 256 bits aléatoires ; seule l'empreinte est stockée. */
export function newApiToken(): string {
  return `${API_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export interface ActiveApiToken {
  id: string;
  userId: string;
}

const toItem = (t: {
  id: string;
  name: string;
  hint: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}): ApiTokenItem => ({
  id: t.id,
  name: t.name,
  hint: t.hint,
  createdAt: t.createdAt.toISOString(),
  lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
});

@Injectable()
export class PrismaApiTokenStore {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ApiTokenItem[]> {
    const rows = await this.prisma.apiToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toItem);
  }

  count(userId: string): Promise<number> {
    return this.prisma.apiToken.count({ where: { userId } });
  }

  async create(userId: string, name: string): Promise<ApiTokenItem & { token: string }> {
    const token = newApiToken();
    const row = await this.prisma.apiToken.create({
      data: { userId, name, tokenHash: hashSessionToken(token), hint: token.slice(-4) },
    });
    return { ...toItem(row), token };
  }

  /** false si le jeton n'existe pas ou appartient à quelqu'un d'autre. */
  async revoke(userId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.apiToken.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  /** Jeton existant d'un compte ni supprimé ni suspendu ; note sa dernière utilisation. */
  async findActive(token: string, now: Date): Promise<ActiveApiToken | null> {
    if (!token.startsWith(API_TOKEN_PREFIX) || token.length > 128) return null;
    const row = await this.prisma.apiToken.findFirst({
      where: {
        tokenHash: hashSessionToken(token),
        user: { deletedAt: null, suspendedAt: null },
      },
      select: { id: true, userId: true, lastUsedAt: true },
    });
    if (!row) return null;
    if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: now } });
    }
    return { id: row.id, userId: row.userId };
  }
}
