import { Injectable } from '@nestjs/common';
import type {
  JoinRequestView,
  ListMessagesQuery,
  ListMessagesResponse,
  MessageView,
  TaskView,
  ListRoomsQuery,
  ListRoomsResponse,
  RoomDetail,
  RoomSummary,
} from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { afterCursor, decodeCursor, encodeCursor } from '../../../infrastructure/http/cursor';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const author = { select: { handle: true, displayName: true, avatarUrl: true, isDemo: true } };
const SEARCH_LIMIT = 200;

const summaryInclude = {
  owner: author,
  _count: { select: { members: true, tasks: { where: { status: 'open' as const } } } },
} satisfies Prisma.RoomInclude;

type RoomRow = Prisma.RoomGetPayload<{ include: typeof summaryInclude }>;

// Lecture des salles (CQRS léger). Une salle « non listée » n'apparaît pas dans les listes
// publiques mais reste accessible par son code ; une salle masquée par la modération jamais.
@Injectable()
export class RoomReader {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListRoomsQuery, viewerId: string | null): Promise<ListRoomsResponse> {
    const ids = query.q ? await this.search(query.q) : null;
    const tagId = query.tag
      ? ((await this.prisma.tag.findUnique({ where: { slug: query.tag }, select: { id: true } }))
          ?.id ?? null)
      : undefined;
    if (tagId === null) return { data: [], page: { hasMore: false, nextCursor: null } };

    const rows = await this.prisma.room.findMany({
      where: {
        hiddenAt: null,
        ...(query.mine
          ? { members: { some: { userId: viewerId ?? '00000000-0000-0000-0000-000000000000' } } }
          : { visibility: 'public' }),
        ...(query.state ? { state: query.state } : {}),
        ...(tagId ? { stackTagIds: { has: tagId } } : {}),
        ...(ids ? { id: { in: ids } } : {}),
        ...afterCursor(decodeCursor(query.cursor)),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: summaryInclude,
    });
    const page = rows.slice(0, query.limit);
    const tags = await this.tags(page.flatMap((r) => r.stackTagIds));
    const last = page.at(-1);
    const hasMore = rows.length > query.limit;
    return {
      data: page.map((r) => this.summary(r, tags)),
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ at: last.createdAt.toISOString(), id: last.id }) : null,
      },
    };
  }

  async detailByCode(code: string, viewerId: string | null): Promise<RoomDetail | null> {
    const room = await this.prisma.room.findFirst({
      where: { inviteCode: code, hiddenAt: null },
      include: {
        ...summaryInclude,
        members: { include: { user: author }, orderBy: { joinedAt: 'asc' } },
      },
    });
    if (!room) return null;
    const tags = await this.tags(room.stackTagIds);
    let viewer: RoomDetail['viewer'] = null;
    if (viewerId) {
      const member = await this.prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: room.id, userId: viewerId } },
        select: { role: true },
      });
      const request = await this.prisma.joinRequest.findFirst({
        where: { roomId: room.id, userId: viewerId },
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      });
      viewer = { role: member?.role ?? null, joinRequest: request?.status ?? null };
    }
    return {
      ...this.summary(room, tags),
      members: room.members.map((m) => ({
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      viewer,
    };
  }

  /** Demandes pour rejoindre (R3), réservé au créateur et aux mainteneurs. */
  async joinRequests(roomId: string, status?: 'pending'): Promise<JoinRequestView[]> {
    const rows = await this.prisma.joinRequest.findMany({
      where: { roomId, ...(status ? { status } : {}) },
      include: { user: author },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      user: r.user,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() ?? null,
    }));
  }

  async roleOf(roomId: string, userId: string) {
    const m = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  /** Tâches d'une salle : ouvertes d'abord, puis prises, en revue, terminées. */
  async tasks(roomId: string): Promise<TaskView[]> {
    const rows = await this.prisma.task.findMany({
      where: { roomId },
      include: { assignee: author },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const order = { open: 0, taken: 1, in_review: 2, done: 3 } as const;
    return rows.sort((a, b) => order[a.status] - order[b.status]).map(taskView);
  }

  async task(taskId: string): Promise<(TaskView & { roomHidden: boolean }) | null> {
    const t = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: author, room: { select: { hiddenAt: true } } },
    });
    return t ? { ...taskView(t), roomHidden: t.room.hiddenAt !== null } : null;
  }

  /** R4 : messages, du plus récent au plus ancien ; ordre fixé par le serveur (created_at, id). */
  async messages(roomId: string, query: ListMessagesQuery): Promise<ListMessagesResponse> {
    const rows = await this.prisma.roomMessage.findMany({
      where: { roomId, hiddenAt: null, ...afterCursor(decodeCursor(query.cursor)) },
      include: { author },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    const hasMore = rows.length > query.limit;
    return {
      data: page.map((m): MessageView => ({
        id: m.id,
        clientId: m.clientId,
        roomId: m.roomId,
        author: m.author,
        kind: m.kind,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ at: last.createdAt.toISOString(), id: last.id }) : null,
      },
    };
  }

  async message(messageId: string): Promise<MessageView | null> {
    const m = await this.prisma.roomMessage.findUnique({
      where: { id: messageId },
      include: { author },
    });
    return m
      ? {
          id: m.id,
          clientId: m.clientId,
          roomId: m.roomId,
          author: m.author,
          kind: m.kind,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        }
      : null;
  }

  async roomOfTask(taskId: string) {
    const t = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { assigneeId: true, room: { select: { id: true, repoFullName: true } } },
    });
    return t
      ? { roomId: t.room.id, repoFullName: t.room.repoFullName, assigneeId: t.assigneeId }
      : null;
  }

  async roomRepo(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, repoFullName: true, hiddenAt: true, visibility: true },
    });
  }

  private summary(r: RoomRow, tags: Map<string, { slug: string; label: string }>): RoomSummary {
    return {
      id: r.id,
      code: r.inviteCode,
      name: r.name,
      description: r.description,
      state: r.state,
      visibility: r.visibility,
      stack: r.stackTagIds.flatMap((id) => (tags.has(id) ? [tags.get(id)!] : [])),
      repo: r.repoFullName
        ? {
            fullName: r.repoFullName,
            url: `https://github.com/${r.repoFullName}`,
            verified: r.repoVerifiedAt !== null,
          }
        : null,
      demoUrl: r.demoUrl,
      owner: r.owner,
      memberCount: r._count.members,
      openTaskCount: r._count.tasks,
      createdAt: r.createdAt.toISOString(),
      lastActivityAt: r.lastActivityAt.toISOString(),
    };
  }

  private async tags(ids: string[]): Promise<Map<string, { slug: string; label: string }>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.tag.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, slug: true, label: true },
    });
    return new Map(rows.map((t) => [t.id, { slug: t.slug, label: t.label }]));
  }

  /** Recherche plein texte sur le nom et la description (colonne générée `search`). */
  private async search(text: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM rooms
      WHERE hidden_at IS NULL AND search @@ websearch_to_tsquery('simple', ${text})
      ORDER BY ts_rank(search, websearch_to_tsquery('simple', ${text})) DESC
      LIMIT ${SEARCH_LIMIT}`;
    return rows.map((r) => r.id);
  }
}

type TaskRow = Prisma.TaskGetPayload<{ include: { assignee: typeof author } }>;

function taskView(t: TaskRow): TaskView {
  return {
    id: t.id,
    roomId: t.roomId,
    title: t.title,
    description: t.description,
    level: t.level,
    status: t.status,
    assignee: t.assignee,
    prUrl: t.prUrl,
    verification: t.verification,
    fromGithubIssue: t.githubIssueId !== null,
    version: t.version,
    createdAt: t.createdAt.toISOString(),
    takenAt: t.takenAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
  };
}
