import { Injectable } from '@nestjs/common';
import { CERT_CATALOG } from '@devhub/core';
import type { ActivityItem, ListActivityQuery, PublicAuthor } from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { resolvePrivacy } from '../../identity';

const actor = {
  select: {
    handle: true,
    displayName: true,
    avatarUrl: true,
    isDemo: true,
    privacy: true,
    deletedAt: true,
    suspendedAt: true,
  },
} as const;

type Actor = PublicAuthor & { privacy: unknown; deletedAt: Date | null; suspendedAt: Date | null };

/** Membre affichable dans le fil : actif, ni supprimé, ni suspendu, ni masqué de l'annuaire. */
const visible = (a: Actor) => !a.deletedAt && !a.suspendedAt && !resolvePrivacy(a.privacy).unlisted;
const author = (a: Actor): PublicAuthor => ({
  handle: a.handle,
  displayName: a.displayName,
  avatarUrl: a.avatarUrl,
  isDemo: a.isDemo,
});

/**
 * Fil d'activité façon GitHub (12/11/2026) : ce que les membres accomplissent sur la plateforme,
 * lu dans les tables existantes. Rien n'est inventé : chaque ligne renvoie à sa preuve.
 */
@Injectable()
export class ActivityReader {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListActivityQuery): Promise<ActivityItem[]> {
    const before = q.before ? new Date(q.before) : new Date();
    const take = q.limit * 2; // de la marge pour les membres masqués
    const [certs, rooms, prs, deployments, labels] = await Promise.all([
      this.prisma.certificate.findMany({
        where: { passedAt: { lt: before } },
        orderBy: { passedAt: 'desc' },
        take,
        select: {
          id: true,
          certId: true,
          bestScore: true,
          code: true,
          passedAt: true,
          user: actor,
        },
      }),
      this.prisma.room.findMany({
        where: { createdAt: { lt: before }, visibility: 'public', hiddenAt: null },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          name: true,
          inviteCode: true,
          repoFullName: true,
          createdAt: true,
          owner: actor,
        },
      }),
      this.prisma.task.findMany({
        where: {
          verification: 'github_verified',
          completedAt: { lt: before },
          prUrl: { not: null },
          assigneeId: { not: null },
          room: { visibility: 'public', hiddenAt: null },
        },
        orderBy: { completedAt: 'desc' },
        take,
        select: {
          id: true,
          title: true,
          prUrl: true,
          completedAt: true,
          assignee: actor,
          room: { select: { name: true } },
        },
      }),
      this.prisma.roomDeployment.findMany({
        where: {
          verifiedAt: { lt: before },
          room: { visibility: 'public', hiddenAt: null },
        },
        orderBy: { verifiedAt: 'desc' },
        take,
        select: {
          roomId: true,
          url: true,
          verifiedAt: true,
          room: { select: { name: true, owner: actor } },
        },
      }),
      this.prisma.preflightLabel.findMany({
        where: { readySince: { lt: before } },
        orderBy: { readySince: 'desc' },
        take,
        select: { id: true, domain: true, score: true, readySince: true, user: actor },
      }),
    ]);

    const titleOf = (certId: string) => CERT_CATALOG.find((c) => c.id === certId)?.title ?? certId;
    const items: Array<ActivityItem & { who: Actor }> = [
      ...certs.map((c) => ({
        id: `cert:${c.id}`,
        kind: 'certificate' as const,
        at: c.passedAt.toISOString(),
        who: c.user,
        actor: author(c.user),
        subject: titleOf(c.certId),
        detail: `${c.bestScore} %`,
        href: `/certificat/${c.code}`,
      })),
      ...rooms.map((r) => ({
        id: `room:${r.id}`,
        kind: 'project' as const,
        at: r.createdAt.toISOString(),
        who: r.owner,
        actor: author(r.owner),
        subject: r.name,
        detail: r.repoFullName,
        href: `/p/${r.inviteCode}`,
      })),
      ...prs.map((t) => ({
        id: `pr:${t.id}`,
        kind: 'merged_pr' as const,
        at: t.completedAt!.toISOString(),
        who: t.assignee!,
        actor: author(t.assignee!),
        subject: t.room.name,
        detail: t.title,
        href: t.prUrl!,
      })),
      ...deployments.map((d) => ({
        id: `deploy:${d.roomId}`,
        kind: 'deployed' as const,
        at: d.verifiedAt!.toISOString(),
        who: d.room.owner,
        actor: author(d.room.owner),
        subject: d.room.name,
        detail: new URL(d.url).hostname,
        href: d.url,
      })),
      ...labels.map((l) => ({
        id: `ready:${l.id}`,
        kind: 'ready' as const,
        at: l.readySince!.toISOString(),
        who: l.user,
        actor: author(l.user),
        subject: l.domain,
        detail: `${l.score}/100`,
        href: `/label/${l.domain}`,
      })),
    ];
    return items
      .filter((i) => visible(i.who))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, q.limit)
      .map(({ who: _who, ...item }) => item);
  }
}
