import { Injectable } from '@nestjs/common';
import type {
  AdminReportView,
  AuditEntry,
  ListAuditQuery,
  ListAuditResponse,
  ListReportsQuery,
  ListReportsResponse,
} from '@devhub/contracts';
import { afterCursor, decodeCursor, encodeCursor } from '../../../infrastructure/http/cursor';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { ReportTargetType } from '../domain/moderation';

const author = { select: { handle: true, displayName: true, avatarUrl: true, isDemo: true } };
const EXCERPT = 200;
const excerpt = (text: string) => (text.length > EXCERPT ? `${text.slice(0, EXCERPT)}…` : text);

type Target = AdminReportView['target'];

// M1 : file de modération (administrateurs), plus récents d'abord.
@Injectable()
export class ReportReader {
  constructor(private readonly prisma: PrismaService) {}

  async isAdmin(userId: string): Promise<boolean> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    return u?.isAdmin === true;
  }

  async list(query: ListReportsQuery): Promise<ListReportsResponse> {
    const rows = await this.prisma.report.findMany({
      where: { status: query.status, ...afterCursor(decodeCursor(query.cursor)) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: { reporter: author },
    });
    const page = rows.slice(0, query.limit);
    const data = await Promise.all(
      page.map(async (r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        handledAt: r.handledAt?.toISOString() ?? null,
        reporter: r.reporter,
        target: await this.target(r.targetType, r.targetId),
        openReportsOnTarget: await this.prisma.report.count({
          where: { targetType: r.targetType, targetId: r.targetId, status: 'open' },
        }),
      })),
    );
    const last = page.at(-1);
    const hasMore = rows.length > query.limit;
    return {
      data,
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ at: last.createdAt.toISOString(), id: last.id }) : null,
      },
    };
  }

  /** M4 : journal des décisions, append-only (admin_actions). */
  async audit(query: ListAuditQuery): Promise<ListAuditResponse> {
    const rows = await this.prisma.adminAction.findMany({
      where: {
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.targetId ? { targetId: query.targetId } : {}),
        ...afterCursor(decodeCursor(query.cursor)),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: { admin: author },
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    const hasMore = rows.length > query.limit;
    return {
      data: page.map((r) => ({
        id: r.id,
        // Colonnes texte du journal, écrites uniquement par la modération (AUDIT_ACTION).
        action: r.action as AuditEntry['action'],
        targetType: r.targetType as ReportTargetType,
        targetId: r.targetId,
        reason: r.reason,
        admin: r.admin,
        createdAt: r.createdAt.toISOString(),
      })),
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ at: last.createdAt.toISOString(), id: last.id }) : null,
      },
    };
  }

  /** Extrait du contenu signalé, masqué ou non : l'administrateur doit voir ce qu'il juge. */
  private async target(type: ReportTargetType, id: string): Promise<Target> {
    const select = { hiddenAt: true, author } as const;
    switch (type) {
      case 'question': {
        const q = await this.prisma.question.findUnique({
          where: { id },
          select: { ...select, title: true, body: true },
        });
        return (
          q && {
            excerpt: excerpt(`${q.title} : ${q.body}`),
            author: q.author,
            hidden: q.hiddenAt !== null,
          }
        );
      }
      case 'answer': {
        const a = await this.prisma.answer.findUnique({
          where: { id },
          select: { ...select, body: true },
        });
        return a && { excerpt: excerpt(a.body), author: a.author, hidden: a.hiddenAt !== null };
      }
      case 'room': {
        const r = await this.prisma.room.findUnique({
          where: { id },
          select: { hiddenAt: true, name: true, description: true, owner: author },
        });
        return (
          r && {
            excerpt: excerpt(`${r.name} : ${r.description}`),
            author: r.owner,
            hidden: r.hiddenAt !== null,
          }
        );
      }
      case 'room_message': {
        const m = await this.prisma.roomMessage.findUnique({
          where: { id },
          select: { ...select, body: true },
        });
        return m && { excerpt: excerpt(m.body), author: m.author, hidden: m.hiddenAt !== null };
      }
      case 'user': {
        const u = await this.prisma.user.findUnique({
          where: { id },
          select: { handle: true, displayName: true, avatarUrl: true, isDemo: true, bio: true },
        });
        if (!u) return null;
        const { bio, ...profile } = u;
        return { excerpt: excerpt(bio ?? `@${u.handle}`), author: profile, hidden: false };
      }
    }
  }
}
