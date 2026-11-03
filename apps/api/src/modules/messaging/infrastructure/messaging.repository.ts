import { Injectable } from '@nestjs/common';
import type {
  ConversationView,
  ConversationsResponse,
  DirectMessageView,
  DirectMessagesResponse,
} from '@devhub/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  publishToTopic,
  publishToUsers,
  signalUsers,
} from '../../../infrastructure/realtime/realtime.publisher';

const PAGE = 50;
/** Garde-fous contre le démarchage : nouvelles conversations par jour, messages par minute. */
export const NEW_CONVERSATIONS_PER_DAY = 20;
export const MESSAGES_PER_MINUTE = 30;

export const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

const PEER = {
  id: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
  country: true,
  deletedAt: true,
  suspendedAt: true,
} as const;

export type StartResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'not_found' | 'self' | 'unavailable' | 'rate_limited' };
export type SendResult =
  | { ok: true; message: DirectMessageView }
  | { ok: false; reason: 'not_found' | 'unavailable' | 'rate_limited' };

@Injectable()
export class MessagingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async blockedEitherWay(a: string, b: string): Promise<{ byMe: boolean; any: boolean }> {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { blockerId: true },
    });
    return { byMe: rows.some((r) => r.blockerId === a), any: rows.length > 0 };
  }

  /** Ouvre ou retrouve la conversation avec ce membre. */
  async start(meId: string, handle: string, now: Date): Promise<StartResult> {
    const peer = await this.prisma.user.findFirst({
      where: { handle, deletedAt: null },
      select: { id: true, suspendedAt: true, isAdmin: true },
    });
    // Les comptes d'administration sont des comptes de service : on ne leur écrit pas.
    if (!peer || peer.isAdmin) return { ok: false, reason: 'not_found' };
    if (peer.id === meId) return { ok: false, reason: 'self' };
    const key = pairKey(meId, peer.id);
    const existing = await this.prisma.conversation.findUnique({ where: { pairKey: key } });
    if (existing) return { ok: true, id: existing.id };
    if (peer.suspendedAt || (await this.blockedEitherWay(meId, peer.id)).any)
      return { ok: false, reason: 'unavailable' };
    const today = await this.prisma.conversationMember.count({
      where: {
        userId: meId,
        conversation: { createdAt: { gte: new Date(now.getTime() - 24 * 3600 * 1000) } },
      },
    });
    if (today >= NEW_CONVERSATIONS_PER_DAY) return { ok: false, reason: 'rate_limited' };
    try {
      const c = await this.prisma.conversation.create({
        data: {
          pairKey: key,
          members: { create: [{ userId: meId }, { userId: peer.id, lastReadAt: now }] },
        },
      });
      return { ok: true, id: c.id };
    } catch {
      // Course : l'autre personne a ouvert la même conversation au même moment.
      const c = await this.prisma.conversation.findUnique({ where: { pairKey: key } });
      return c ? { ok: true, id: c.id } : { ok: false, reason: 'not_found' };
    }
  }

  private async unreadBy(meId: string, conversationIds?: string[]): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<{ id: string; n: number }[]>`
      SELECT m.conversation_id AS id, count(*)::int AS n
        FROM direct_messages m
        JOIN conversation_members cm
          ON cm.conversation_id = m.conversation_id AND cm.user_id = ${meId}::uuid
       WHERE m.author_id <> ${meId}::uuid
         AND m.created_at > cm.last_read_at
         AND m.hidden_at IS NULL
       GROUP BY 1`;
    const all = new Map(rows.map((r) => [r.id, r.n]));
    if (!conversationIds) return all;
    return new Map(conversationIds.map((id) => [id, all.get(id) ?? 0]));
  }

  private async views(meId: string, ids: string[]): Promise<ConversationView[]> {
    if (!ids.length) return [];
    const [rows, unread, blocks] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { id: { in: ids } },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          members: { include: { user: { select: PEER } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { body: true, createdAt: true, authorId: true, hiddenAt: true },
          },
        },
      }),
      this.unreadBy(meId, ids),
      this.prisma.userBlock.findMany({
        where: { OR: [{ blockerId: meId }, { blockedId: meId }] },
        select: { blockerId: true, blockedId: true },
      }),
    ]);
    return rows.map((c) => {
      const peer = c.members.find((m) => m.userId !== meId)!.user;
      const last = c.messages[0];
      const blocked = blocks.some((b) => b.blockerId === meId && b.blockedId === peer.id);
      const blockedMe = blocks.some((b) => b.blockerId === peer.id && b.blockedId === meId);
      const active = !peer.deletedAt && !peer.suspendedAt;
      return {
        id: c.id,
        peer: {
          handle: peer.handle,
          displayName: peer.displayName,
          avatarUrl: peer.avatarUrl,
          country: peer.country,
          active,
        },
        lastMessage: last
          ? {
              body: last.hiddenAt ? '' : last.body.slice(0, 160),
              at: last.createdAt.toISOString(),
              mine: last.authorId === meId,
            }
          : null,
        unread: unread.get(c.id) ?? 0,
        blocked,
        canWrite: active && !blocked && !blockedMe,
      };
    });
  }

  async list(meId: string): Promise<ConversationsResponse> {
    const mine = await this.prisma.conversationMember.findMany({
      where: { userId: meId, conversation: { messages: { some: {} } } },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
      take: 100,
      select: { conversationId: true },
    });
    const data = await this.views(
      meId,
      mine.map((m) => m.conversationId),
    );
    return { data, unreadTotal: data.reduce((n, c) => n + c.unread, 0) };
  }

  async isMember(meId: string, conversationId: string): Promise<boolean> {
    return (
      (await this.prisma.conversationMember.count({ where: { conversationId, userId: meId } })) > 0
    );
  }

  async messages(
    meId: string,
    conversationId: string,
    before: Date | null,
  ): Promise<DirectMessagesResponse | null> {
    if (!(await this.isMember(meId, conversationId))) return null;
    const [conversation] = await this.views(meId, [conversationId]);
    const rows = await this.prisma.directMessage.findMany({
      where: { conversationId, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE + 1,
    });
    const hasMore = rows.length > PAGE;
    const data = rows
      .slice(0, PAGE)
      .reverse()
      .map((m): DirectMessageView => ({
        id: m.id,
        mine: m.authorId === meId,
        body: m.hiddenAt ? '' : m.body,
        createdAt: m.createdAt.toISOString(),
        hidden: m.hiddenAt !== null,
      }));
    return { conversation: conversation!, data, hasMore };
  }

  async markRead(meId: string, conversationId: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId: meId },
      data: { lastReadAt: now },
    });
    return count > 0;
  }

  async send(
    meId: string,
    conversationId: string,
    body: string,
    clientId: string,
    now: Date,
  ): Promise<SendResult> {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId: meId } } },
      include: { members: { include: { user: { select: PEER } } } },
    });
    if (!conv) return { ok: false, reason: 'not_found' };
    const toView = (m: { id: string; body: string; createdAt: Date }): DirectMessageView => ({
      id: m.id,
      mine: true,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      hidden: false,
    });
    // Même clientId : le message a déjà été enregistré (nouvel essai après une coupure).
    const dup = await this.prisma.directMessage.findUnique({
      where: { authorId_clientId: { authorId: meId, clientId } },
    });
    if (dup) return { ok: true, message: toView(dup) };

    const peerMember = conv.members.find((m) => m.userId !== meId)!;
    const peer = peerMember.user;
    if (peer.deletedAt || peer.suspendedAt || (await this.blockedEitherWay(meId, peer.id)).any)
      return { ok: false, reason: 'unavailable' };
    const recent = await this.prisma.directMessage.count({
      where: { authorId: meId, createdAt: { gte: new Date(now.getTime() - 60_000) } },
    });
    if (recent >= MESSAGES_PER_MINUTE) return { ok: false, reason: 'rate_limited' };

    const me = conv.members.find((m) => m.userId === meId)!.user;
    // Une notification par série : seulement si le destinataire avait tout lu jusque-là.
    const peerUpToDate =
      (await this.prisma.directMessage.count({
        where: {
          conversationId,
          authorId: meId,
          hiddenAt: null,
          createdAt: { gt: peerMember.lastReadAt },
        },
      })) === 0;
    const message = await this.prisma.$transaction(async (tx) => {
      const m = await tx.directMessage.create({
        data: { conversationId, authorId: meId, clientId, body, createdAt: now },
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } });
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: meId } },
        data: { lastReadAt: now },
      });
      if (peerUpToDate) {
        await tx.notification.create({
          data: {
            userId: peer.id,
            type: 'message.received',
            payload: { conversationId, author: me.displayName, by: me.handle },
          },
        });
        await publishToUsers(tx, [peer.id]);
      }
      await signalUsers(tx, [peer.id], 'dm');
      await publishToTopic(tx, `dm:${conversationId}`, 'dm.message', { conversationId });
      return m;
    });
    return { ok: true, message: toView(message) };
  }

  async block(meId: string, handle: string): Promise<boolean> {
    const peer = await this.prisma.user.findFirst({ where: { handle, deletedAt: null } });
    if (!peer || peer.id === meId) return false;
    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: meId, blockedId: peer.id } },
      create: { blockerId: meId, blockedId: peer.id },
      update: {},
    });
    return true;
  }

  async unblock(meId: string, handle: string): Promise<boolean> {
    const peer = await this.prisma.user.findFirst({ where: { handle } });
    if (!peer) return false;
    await this.prisma.userBlock.deleteMany({ where: { blockerId: meId, blockedId: peer.id } });
    return true;
  }
}
