import type { Tx } from '../../../infrastructure/idempotency/idempotency.service';
import type { AnswerState, QuestionState } from '../domain/answer';
import type { AnswerWriter, StoredAnswer } from '../domain/ports';

const answerSelect = {
  id: true,
  clientId: true,
  questionId: true,
  body: true,
  isAccepted: true,
  helpfulCount: true,
  version: true,
  createdAt: true,
  author: { select: { handle: true, displayName: true, avatarUrl: true, isDemo: true } },
} as const;

/** Écritures des réponses (S4), dans la transaction de la requête. */
export class PrismaAnswerWriter implements AnswerWriter {
  constructor(private readonly tx: Tx) {}

  async lockAuthor(authorId: string): Promise<void> {
    await this.tx
      .$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${`sos.answer:${authorId}`}, 0))) AS l`;
  }

  async lockQuestion(questionId: string): Promise<QuestionState | null> {
    await this.tx.$queryRaw`SELECT id FROM questions WHERE id = ${questionId}::uuid FOR UPDATE`;
    return this.findQuestion(questionId);
  }

  async findQuestion(questionId: string): Promise<QuestionState | null> {
    const q = await this.tx.question.findFirst({
      where: { id: questionId, hiddenAt: null },
      select: {
        id: true,
        title: true,
        authorId: true,
        status: true,
        acceptedAnswerId: true,
        createdAt: true,
        tags: { select: { tagId: true } },
      },
    });
    return q ? { ...q, tagIds: q.tags.map((t) => t.tagId) } : null;
  }

  findAnswer(answerId: string): Promise<AnswerState | null> {
    return this.tx.answer.findFirst({
      where: { id: answerId, hiddenAt: null },
      select: { id: true, questionId: true, authorId: true },
    });
  }

  findAnswerByClientId(authorId: string, clientId: string): Promise<StoredAnswer | null> {
    return this.tx.answer.findUnique({
      where: { authorId_clientId: { authorId, clientId } },
      select: answerSelect,
    });
  }

  createAnswer(a: {
    questionId: string;
    authorId: string;
    clientId: string;
    body: string;
  }): Promise<StoredAnswer> {
    return this.tx.answer.create({ data: a, select: answerSelect });
  }

  async markAccepted(questionId: string, answerId: string, at: Date): Promise<void> {
    await this.tx.answer.update({ where: { id: answerId }, data: { isAccepted: true } });
    await this.tx.question.update({
      where: { id: questionId },
      data: { status: 'resolved', acceptedAnswerId: answerId, resolvedAt: at },
    });
  }

  async addVote(answerId: string, voterId: string): Promise<boolean> {
    const inserted = await this.tx.$executeRaw`
      INSERT INTO votes (answer_id, voter_id) VALUES (${answerId}::uuid, ${voterId}::uuid)
      ON CONFLICT DO NOTHING`;
    if (inserted === 0) return false;
    await this.tx.answer.update({
      where: { id: answerId },
      data: { helpfulCount: { increment: 1 } },
    });
    return true;
  }

  async helpfulCount(answerId: string): Promise<number> {
    const a = await this.tx.answer.findUniqueOrThrow({
      where: { id: answerId },
      select: { helpfulCount: true },
    });
    return a.helpfulCount;
  }

  async userCreatedAt(userId: string): Promise<Date> {
    const u = await this.tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { createdAt: true },
    });
    return u.createdAt;
  }

  async handles(userIds: string[]): Promise<Map<string, string>> {
    const users = await this.tx.user.findMany({
      where: { id: { in: [...new Set(userIds)] } },
      select: { id: true, handle: true },
    });
    return new Map(users.map((u) => [u.id, u.handle]));
  }
}
