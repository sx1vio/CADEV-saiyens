import { Injectable } from '@nestjs/common';
import type {
  SystalinkEcosystemResponse,
  SystalinkSource,
  SystalinkTarget,
} from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/** Idées A et B : renvois vers Systalink et salles en production chez Systalink. */
@Injectable()
export class EcosystemReader {
  constructor(private readonly prisma: PrismaService) {}

  async record(r: {
    target: SystalinkTarget;
    source: SystalinkSource;
    roomCode?: string;
    userId: string | null;
  }): Promise<{ repoUrl: string | null }> {
    const room = r.roomCode
      ? await this.prisma.room.findFirst({
          where: { inviteCode: r.roomCode, hiddenAt: null },
          select: { id: true, repoFullName: true, repoVerifiedAt: true },
        })
      : null;
    await this.prisma.systalinkReferral.create({
      data: { target: r.target, source: r.source, roomId: room?.id ?? null, userId: r.userId },
    });
    return {
      repoUrl:
        room?.repoFullName && room.repoVerifiedAt
          ? `https://github.com/${room.repoFullName}`
          : null,
    };
  }

  async ecosystem(now = new Date()): Promise<SystalinkEcosystemResponse> {
    const since = new Date(now.getTime() - 30 * 86_400_000);
    const onSystalink = {
      verifiedAt: { not: null },
      hostedOnSystalink: true,
      room: { hiddenAt: null, visibility: 'public' as const },
    };
    const [total, last30Days, bySource, roomsOnSystalink, showcase] = await Promise.all([
      this.prisma.systalinkReferral.count(),
      this.prisma.systalinkReferral.count({ where: { createdAt: { gte: since } } }),
      this.prisma.systalinkReferral.groupBy({ by: ['source'], _count: { _all: true } }),
      this.prisma.roomDeployment.count({ where: onSystalink }),
      this.prisma.roomDeployment.findMany({
        where: onSystalink,
        orderBy: { verifiedAt: 'desc' },
        take: 6,
        select: {
          url: true,
          verifiedAt: true,
          checksUp: true,
          checksTotal: true,
          room: { select: { inviteCode: true, name: true } },
        },
      }),
    ]);
    return {
      referrals: {
        total,
        last30Days,
        bySource: bySource
          .map((s) => ({ source: s.source as SystalinkSource, count: s._count._all }))
          .sort((a, b) => b.count - a.count),
      },
      roomsOnSystalink,
      showcase: showcase.map((d) => ({
        code: d.room.inviteCode,
        name: d.room.name,
        url: d.url,
        uptime: d.checksTotal ? Math.round((d.checksUp / d.checksTotal) * 1000) / 1000 : null,
        verifiedAt: d.verifiedAt!.toISOString(),
      })),
      computedAt: now.toISOString(),
    };
  }
}
