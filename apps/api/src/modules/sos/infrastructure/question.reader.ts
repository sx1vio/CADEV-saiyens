import { Injectable } from '@nestjs/common';
import type {
  AnswerView,
  ListQuestionsQuery,
  ListQuestionsResponse,
  QuestionDetail,
  QuestionSummary,
} from '@devhub/contracts';
import { afterCursor, decodeCursor, encodeCursor } from '../../../infrastructure/http/cursor';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const author = { select: { handle: true, displayName: true, avatarUrl: true, isDemo: true } };
const tags = { select: { tag: { select: { slug: true, label: true } } } };

/** Nombre maximal de résultats de la recherche plein texte (S6) avant pagination. */
const SEARCH_LIMIT = 200;

// Lecture de SOS Dev (CQRS léger, docs/architecture/02-backend.md) : requêtes directes, sans
// entité de domaine. Les contenus masqués par la modération ne sont jamais renvoyés.
@Injectable()
export class QuestionReader {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuestionsQuery, viewerId: string | null): Promise<ListQuestionsResponse> {
    const ids = query.q ? await this.search(query.q) : null;
    const rows = await this.prisma.question.findMany({
      where: {
        hiddenAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
        ...(query.mine ? { authorId: viewerId ?? '00000000-0000-0000-0000-000000000000' } : {}),
        ...(query.unanswered ? { answers: { none: { hiddenAt: null } } } : {}),
        ...(ids ? { id: { in: ids } } : {}),
        ...afterCursor(decodeCursor(query.cursor)),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: {
        author,
        tags,
        _count: { select: { answers: { where: { hiddenAt: null } } } },
      },
    });

    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    const hasMore = rows.length > query.limit;
    return {
      data: page.map((q): QuestionSummary => ({
        id: q.id,
        title: q.title,
        status: q.status,
        urgency: q.urgency,
        lang: q.lang,
        tags: q.tags.map((t) => t.tag),
        answerCount: q._count.answers,
        createdAt: q.createdAt.toISOString(),
        resolvedAt: q.resolvedAt?.toISOString() ?? null,
        author: q.author,
      })),
      page: {
        hasMore,
        nextCursor:
          hasMore && last ? encodeCursor({ at: last.createdAt.toISOString(), id: last.id }) : null,
      },
    };
  }

  async detail(id: string): Promise<QuestionDetail | null> {
    const q = await this.prisma.question.findFirst({
      where: { id, hiddenAt: null },
      include: {
        author,
        tags,
        answers: {
          where: { hiddenAt: null },
          include: { author },
          orderBy: [{ isAccepted: 'desc' }, { helpfulCount: 'desc' }, { createdAt: 'asc' }],
        },
        matchEvents: {
          include: { helper: author },
          orderBy: [{ wave: 'asc' }, { rank: 'asc' }],
        },
      },
    });
    if (!q) return null;
    return {
      id: q.id,
      title: q.title,
      body: q.body,
      codeSnippet: q.codeSnippet,
      status: q.status,
      urgency: q.urgency,
      lang: q.lang,
      version: q.version,
      tags: q.tags.map((t) => t.tag),
      answerCount: q.answers.length,
      createdAt: q.createdAt.toISOString(),
      resolvedAt: q.resolvedAt?.toISOString() ?? null,
      author: q.author,
      aiHint: q.aiStatus === 'done' ? q.aiHint : null,
      aiStatus: q.aiStatus,
      acceptedAnswerId: q.acceptedAnswerId,
      answers: q.answers.map((a): AnswerView => ({
        id: a.id,
        body: a.body,
        isAccepted: a.isAccepted,
        helpfulCount: a.helpfulCount,
        version: a.version,
        createdAt: a.createdAt.toISOString(),
        author: a.author,
      })),
      helpers: q.matchEvents.map((m) => ({
        helper: m.helper,
        wave: m.wave,
        rank: m.rank,
        reasons: m.reasons as QuestionDetail['helpers'][number]['reasons'],
        notifiedAt: m.notifiedAt.toISOString(),
        claimedAt: m.claimedAt?.toISOString() ?? null,
      })),
    };
  }

  /** S6 : recherche plein texte sur titre et corps (colonne générée `search`, index GIN). */
  private async search(text: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM questions
      WHERE hidden_at IS NULL AND search @@ websearch_to_tsquery('simple', ${text})
      ORDER BY ts_rank(search, websearch_to_tsquery('simple', ${text})) DESC
      LIMIT ${SEARCH_LIMIT}`;
    return rows.map((r) => r.id);
  }
}
