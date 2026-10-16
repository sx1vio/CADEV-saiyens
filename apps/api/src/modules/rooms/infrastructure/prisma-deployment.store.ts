import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  DeploymentRoom,
  DeploymentState,
  DeploymentStore,
  DeploymentUnitOfWork,
} from '../domain/ports';
import type { RoomRole } from '../domain/room';

type Tx = Prisma.TransactionClient;

/** Preuves de déploiement des salles (table room_deployments). */
export class PrismaDeploymentStore implements DeploymentStore {
  constructor(private readonly tx: Tx) {}

  async findRoom(roomId: string): Promise<DeploymentRoom | null> {
    const room = await this.tx.room.findUnique({
      where: { id: roomId },
      select: { id: true, ownerId: true, stackTagIds: true, hiddenAt: true },
    });
    return room ? { ...room, hidden: room.hiddenAt !== null } : null;
  }

  async roleOf(roomId: string, userId: string): Promise<RoomRole | null> {
    const m = await this.tx.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  find(roomId: string): Promise<DeploymentState | null> {
    return this.tx.roomDeployment.findUnique({
      where: { roomId },
      select: { roomId: true, url: true, token: true, verifiedAt: true, hostedOnSystalink: true },
    });
  }

  async save(d: { roomId: string; url: string; token: string; reset: boolean }): Promise<void> {
    const reset = d.reset
      ? {
          verifiedAt: null,
          hostedOnSystalink: false,
          hostIp: null,
          lastCheckAt: null,
          lastUp: null,
          lastLatencyMs: null,
          checksTotal: 0,
          checksUp: 0,
        }
      : {};
    await this.tx.roomDeployment.upsert({
      where: { roomId: d.roomId },
      create: { roomId: d.roomId, url: d.url, token: d.token },
      update: { url: d.url, token: d.token, ...reset },
    });
  }

  async markVerified(
    roomId: string,
    v: { at: Date; hostedOnSystalink: boolean; hostIp: string | null },
  ): Promise<void> {
    await this.tx.roomDeployment.update({
      where: { roomId },
      data: { verifiedAt: v.at, hostedOnSystalink: v.hostedOnSystalink, hostIp: v.hostIp },
    });
  }

  async recordCheck(
    roomId: string,
    c: {
      at: Date;
      up: boolean;
      latencyMs: number | null;
      hostedOnSystalink: boolean;
      hostIp: string | null;
    },
  ): Promise<void> {
    await this.tx.roomDeployment.updateMany({
      where: { roomId, verifiedAt: { not: null } },
      data: {
        lastCheckAt: c.at,
        lastUp: c.up,
        lastLatencyMs: c.latencyMs,
        checksTotal: { increment: 1 },
        checksUp: { increment: c.up ? 1 : 0 },
        // Une coupure ne fait pas perdre l'hébergement : on ne le revoit que si l'application répond.
        ...(c.up ? { hostedOnSystalink: c.hostedOnSystalink, hostIp: c.hostIp } : {}),
      },
    });
  }

  listVerified(): Promise<Array<{ roomId: string; url: string }>> {
    return this.tx.roomDeployment.findMany({
      where: { verifiedAt: { not: null }, room: { hiddenAt: null } },
      select: { roomId: true, url: true },
      orderBy: { verifiedAt: 'asc' },
    });
  }
}

@Injectable()
export class PrismaDeploymentUnitOfWork implements DeploymentUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(fn: (store: DeploymentStore, tx: unknown) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(new PrismaDeploymentStore(tx), tx));
  }
}
