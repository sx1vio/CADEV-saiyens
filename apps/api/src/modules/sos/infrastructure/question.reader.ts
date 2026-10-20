import { Injectable } from '@nestjs/common';
import type {
  AnswerView,
  ListQuestionsQuery,
  ListQuestionsResponse,
  QuestionDetail,
  QuestionSummary,
} from '@devhub/contracts';
import {
  type Cursor,
  afterCursor,
  decodeCursor,
  encodeCursor,
} from '../../../infrastructure/http/cursor';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const author = { select: { handle: true, displayName: true, avatarUrl: true, isDemo: true } };
const tags = { select: { tag: { select: { slug: true, label: true } } } };

/** S16 : de la plus urgente à la moins urgente (ordre de l'enum `Urgency` inversé). */
const URGENCY_DESC = ['high', 'normal', 'low'] as const;

/** Nombre maximal de résultats de la recherche plein texte (S6) avant pagination. */
const SEARCH_LIMIT = 200;

// Lecture de SOS Dev (CQRS léger, docs/architecture/02-backend.md) : requêtes directes, sans
// entité de domaine. Les contenus masqués par la modération ne sont jamais renvoyés.
@Injectable()
export class QuestionReader {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuestionsQuery, viewerId: string | null): Promise<ListQuestionsResponse> {
    const ranked = query.q ? await this.search(query.q) : null;
    const cursor = decodeCursor(query.cursor);
    const where = {
      hiddenAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.mine ? { authorId: viewerId ?? '00000000-0000-0000-0000-000000000000' } : {}),
      ...(query.unanswered ? { answers: { none: { hiddenAt: null } } } : {}),
      // `tag` et « mes stacks » portent tous deux sur `tags` : combinés, jamais écrasés.
      AND: [
        query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {},
        query.forMe ? await this.myStacks(viewerId) : {},
      ],
    };
    const include = {
      author,
      tags,
      _count: { select: { answers: { where: { hiddenAt: null } } } },
    };

    let rows;
    if (ranked) {
      // S6 : avec une recherche, l'ordre est celui de la pertinence ; la page suivante reprend
      // juste après le dernier résultat reçu (même curseur opaque, l'identifiant suffit).
      const found = await this.prisma.question.findMany({
        where: { ...where, id: { in: ranked } },
        include,
      });
      const position = new Map(ranked.map((id, i) => [id, i]));
      found.sort((a, b) => position.get(a.id)! - position.get(b.id)!);
      const start = cursor ? found.findIndex((r) => r.id === cursor.id) + 1 : 0;
      rows = found.slice(start, start + query.limit + 1);
    } else if (query.sort === 'waiting') {
      rows = await this.prisma.question.findMany({
        where: { AND: [where, await this.afterWaiting(cursor)] },
        orderBy: [{ urgency: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: query.limit + 1,
        include,
      });
    } else {
      rows = await this.prisma.question.findMany({
        where: { ...where, ...afterCursor(cursor) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        include,
      });
    }

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

  /**
   * S16 : « mes stacks », les étiquettes de mes compétences et de « Je peux aider sur ». Sans
   * session ou sans étiquette (compte neuf), aucun filtre : la file reste visible.
   */
  private async myStacks(viewerId: string | null) {
    if (!viewerId) return {};
    const [skills, user] = await Promise.all([
      this.prisma.userSkill.findMany({ where: { userId: viewerId }, select: { tagId: true } }),
      this.prisma.user.findUnique({ where: { id: viewerId }, select: { canHelpTagIds: true } }),
    ]);
    const tagIds = [...new Set([...skills.map((s) => s.tagId), ...(user?.canHelpTagIds ?? [])])];
    return tagIds.length ? { tags: { some: { tagId: { in: tagIds } } } } : {};
  }

  /**
   * S16 : suite de la file triée (urgence décroissante, puis la plus ancienne d'abord). Le curseur
   * garde son format (date, identifiant) ; l'urgence de la dernière question reçue est relue.
   */
  private async afterWaiting(cursor: Cursor | null) {
    if (!cursor) return {};
    const last = await this.prisma.question.findUnique({
      where: { id: cursor.id },
      select: { urgency: true },
    });
    if (!last) return {};
    const at = new Date(cursor.at);
    const lessUrgent = URGENCY_DESC.slice(URGENCY_DESC.indexOf(last.urgency) + 1);
    return {
      OR: [
        { urgency: { in: lessUrgent } },
        {
          urgency: last.urgency,
          OR: [{ createdAt: { gt: at } }, { createdAt: at, id: { gt: cursor.id } }],
        },
      ],
    };
  }

  /**
   * S6 : recherche plein texte (colonnes générées `search`, index GIN) sur le titre et le corps de
   * la question, et sur sa réponse acceptée : une question résolue se retrouve aussi par les mots
   * de sa solution. Identifiants triés par pertinence, puis du plus récent au plus ancien.
   */
  private async search(text: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT q.id
      FROM questions q
      CROSS JOIN websearch_to_tsquery('simple', ${text}) query
      LEFT JOIN answers a
        ON a.question_id = q.id AND a.is_accepted AND a.hidden_at IS NULL
      WHERE q.hidden_at IS NULL AND (q.search @@ query OR a.search @@ query)
      ORDER BY ts_rank(q.search, query) + coalesce(ts_rank(a.search, query), 0) DESC,
        q.created_at DESC, q.id DESC
      LIMIT ${SEARCH_LIMIT}`;
    return rows.map((r) => r.id);
  }
}
