import { Injectable } from '@nestjs/common';
import {
  COMMUNITY_SLUGS,
  type CommunitySlug,
  type CreatePostRequest,
  type ListCommunitiesResponse,
  type ListPostsQuery,
  type ListPostsResponse,
  type PostCommentView,
  type PostDetail,
  type PostKind,
  type PostView,
} from '@devhub/contracts';
import { afterCursor, decodeCursor, encodeCursor } from '../../../infrastructure/http/cursor';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TOP_WINDOW_DAYS } from '../domain/limits';

const author = { select: { handle: true, displayName: true, avatarUrl: true, isDemo: true } };
const DAY = 24 * 60 * 60 * 1000;

type Row = {
  id: string;
  authorId: string;
  community: string;
  kind: string;
  title: string;
  body: string;
  linkUrl: string | null;
  code: string | null;
  tags: string[];
  createdAt: Date;
  author: PostView['author'];
  _count: { comments: number };
};

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async views(rows: Row[], viewer: string | null): Promise<PostView[]> {
    const ids = rows.map((r) => r.id);
    const [scores, mine] = await Promise.all([
      ids.length
        ? this.prisma.postVote.groupBy({
            by: ['postId'],
            where: { postId: { in: ids } },
            _sum: { value: true },
          })
        : [],
      viewer && ids.length
        ? this.prisma.postVote.findMany({ where: { postId: { in: ids }, userId: viewer } })
        : [],
    ]);
    const score = new Map(scores.map((s) => [s.postId, s._sum.value ?? 0]));
    const my = new Map(mine.map((v) => [v.postId, v.value]));
    return rows.map((r) => ({
      id: r.id,
      community: r.community as CommunitySlug,
      kind: r.kind as PostKind,
      title: r.title,
      body: r.body,
      linkUrl: r.linkUrl,
      code: r.code,
      tags: r.tags,
      author: r.author,
      score: score.get(r.id) ?? 0,
      myVote: my.get(r.id) ?? 0,
      comments: r._count.comments,
      mine: viewer === r.authorId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private readonly select = {
    id: true,
    authorId: true,
    community: true,
    kind: true,
    title: true,
    body: true,
    linkUrl: true,
    code: true,
    tags: true,
    createdAt: true,
    author,
    _count: { select: { comments: { where: { hiddenAt: null } } } },
  } as const;

  async list(q: ListPostsQuery, viewer: string | null): Promise<ListPostsResponse> {
    const base = {
      hiddenAt: null,
      author: { deletedAt: null, ...(q.author ? { handle: q.author } : {}) },
      ...(q.community ? { community: q.community } : {}),
    };
    if (q.sort === 'top') {
      // Populaires : les publications récentes triées par score (pas de pagination profonde).
      const rows = await this.prisma.post.findMany({
        where: { ...base, createdAt: { gte: new Date(Date.now() - TOP_WINDOW_DAYS * DAY) } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: this.select,
      });
      const views = await this.views(rows, viewer);
      views.sort((a, b) => b.score - a.score || b.comments - a.comments);
      return { data: views.slice(0, q.limit), page: { hasMore: false, nextCursor: null } };
    }
    const rows = await this.prisma.post.findMany({
      where: { ...base, ...afterCursor(decodeCursor(q.cursor)) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      select: this.select,
    });
    const page = rows.slice(0, q.limit);
    const last = page.at(-1);
    const hasMore = rows.length > q.limit;
    return {
      data: await this.views(page, viewer),
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ at: last.createdAt.toISOString(), id: last.id }) : null,
      },
    };
  }

  async detail(id: string, viewer: string | null): Promise<PostDetail | null> {
    const row = await this.prisma.post.findFirst({
      where: { id, hiddenAt: null, author: { deletedAt: null } },
      select: this.select,
    });
    if (!row) return null;
    const [view] = await this.views([row], viewer);
    const comments = await this.prisma.postComment.findMany({
      where: { postId: id, hiddenAt: null },
      orderBy: { createdAt: 'asc' },
      take: 1000,
      select: { id: true, parentId: true, body: true, createdAt: true, authorId: true, author },
    });
    const commentList: PostCommentView[] = comments.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      body: c.body,
      author: c.author,
      mine: viewer === c.authorId,
      createdAt: c.createdAt.toISOString(),
    }));
    return { ...view!, commentList };
  }

  countSince(model: 'post' | 'comment', authorId: string, since: Date): Promise<number> {
    return model === 'post'
      ? this.prisma.post.count({ where: { authorId, createdAt: { gte: since } } })
      : this.prisma.postComment.count({ where: { authorId, createdAt: { gte: since } } });
  }

  async create(input: CreatePostRequest, authorId: string): Promise<string> {
    const row = await this.prisma.post.create({
      data: {
        authorId,
        community: input.community,
        kind: input.kind,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl,
        code: input.code,
        tags: [...new Set(input.tags.map((t) => t.toLowerCase()))],
      },
      select: { id: true },
    });
    // L'auteur vote pour sa publication, comme sur la plupart des forums.
    await this.prisma.postVote.create({ data: { postId: row.id, userId: authorId, value: 1 } });
    return row.id;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.post.count({ where: { id, hiddenAt: null } })) > 0;
  }

  async commentBelongs(commentId: string, postId: string): Promise<boolean> {
    return (await this.prisma.postComment.count({ where: { id: commentId, postId } })) > 0;
  }

  async addComment(postId: string, authorId: string, body: string, parentId: string | null) {
    const c = await this.prisma.postComment.create({
      data: { postId, authorId, body, parentId },
      select: { id: true },
    });
    return c.id;
  }

  async vote(postId: string, userId: string, value: -1 | 0 | 1) {
    if (value === 0) await this.prisma.postVote.deleteMany({ where: { postId, userId } });
    else
      await this.prisma.postVote.upsert({
        where: { postId_userId: { postId, userId } },
        create: { postId, userId, value },
        update: { value },
      });
    const sum = await this.prisma.postVote.aggregate({ where: { postId }, _sum: { value: true } });
    return { score: sum._sum.value ?? 0, myVote: value };
  }

  /** L'auteur supprime sa publication (les commentaires et votes partent avec). */
  async deleteOwn(id: string, authorId: string): Promise<boolean> {
    const { count } = await this.prisma.post.deleteMany({ where: { id, authorId } });
    return count > 0;
  }

  async deleteOwnComment(id: string, authorId: string): Promise<boolean> {
    // Un commentaire qui a des réponses est vidé plutôt que supprimé, pour garder le fil lisible.
    const replies = await this.prisma.postComment.count({ where: { parentId: id } });
    if (replies > 0) {
      const { count } = await this.prisma.postComment.updateMany({
        where: { id, authorId },
        data: { body: '[supprimé par son auteur]' },
      });
      return count > 0;
    }
    const { count } = await this.prisma.postComment.deleteMany({ where: { id, authorId } });
    return count > 0;
  }

  async communities(now: Date): Promise<ListCommunitiesResponse> {
    const week = new Date(now.getTime() - 7 * DAY);
    const [all, recent, authors] = await Promise.all([
      this.prisma.post.groupBy({
        by: ['community'],
        where: { hiddenAt: null },
        _count: { _all: true },
      }),
      this.prisma.post.groupBy({
        by: ['community'],
        where: { hiddenAt: null, createdAt: { gte: week } },
        _count: { _all: true },
      }),
      this.prisma.post.groupBy({ by: ['community', 'authorId'], where: { hiddenAt: null } }),
    ]);
    const n = (list: { community: string; _count: { _all: number } }[], slug: string) =>
      list.find((x) => x.community === slug)?._count._all ?? 0;
    return {
      data: COMMUNITY_SLUGS.map((slug) => ({
        slug,
        posts: n(all, slug),
        posts7d: n(recent, slug),
        authors: authors.filter((a) => a.community === slug).length,
      })),
    };
  }
}
