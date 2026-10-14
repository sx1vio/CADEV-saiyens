import type { Tx } from '../../../infrastructure/idempotency/idempotency.service';
import type { NewQuestion, QuestionWriter, StoredQuestion } from '../domain/ports';

const authorSelect = { handle: true, displayName: true, avatarUrl: true, isDemo: true } as const;
const questionSelect = {
  id: true,
  clientId: true,
  status: true,
  aiStatus: true,
  version: true,
  createdAt: true,
  author: { select: authorSelect },
} as const;

/** Écritures de SOS Dev, dans la transaction de la requête. */
export class PrismaQuestionWriter implements QuestionWriter {
  constructor(private readonly tx: Tx) {}

  async lockAuthor(authorId: string): Promise<void> {
    // Verrou consultatif de transaction, libéré au COMMIT ou au ROLLBACK.
    await this.tx
      .$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${`sos.ask:${authorId}`}, 0))) AS l`;
  }

  findByClientId(authorId: string, clientId: string): Promise<StoredQuestion | null> {
    return this.tx.question.findUnique({
      where: { authorId_clientId: { authorId, clientId } },
      select: questionSelect,
    });
  }

  async createdSince(authorId: string, since: Date): Promise<Date[]> {
    const rows = await this.tx.question.findMany({
      where: { authorId, createdAt: { gte: since } },
      select: { createdAt: true },
    });
    return rows.map((r) => r.createdAt);
  }

  async tagIdsBySlug(slugs: string[]): Promise<Map<string, string>> {
    const tags = await this.tx.tag.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    return new Map(tags.map((t) => [t.slug, t.id]));
  }

  create(q: NewQuestion): Promise<StoredQuestion> {
    return this.tx.question.create({
      data: {
        authorId: q.authorId,
        clientId: q.clientId,
        title: q.title,
        body: q.body,
        codeSnippet: q.codeSnippet,
        urgency: q.urgency,
        lang: q.lang,
        tags: { create: q.tagIds.map((tagId) => ({ tagId })) },
      },
      select: questionSelect,
    });
  }
}
