import type { Prisma } from '../../../generated/prisma/client';
import type { Tx } from '../../../infrastructure/idempotency/idempotency.service';
import type { AnswerText, EditWriter, QuestionText } from '../domain/edit';

/** Modifications versionnées (O4), dans la transaction de la requête. */
export class PrismaEditWriter implements EditWriter {
  constructor(private readonly tx: Tx) {}

  async lockQuestion(id: string): Promise<QuestionText | null> {
    await this.tx.$queryRaw`SELECT id FROM questions WHERE id = ${id}::uuid FOR UPDATE`;
    return this.tx.question.findFirst({
      where: { id, hiddenAt: null },
      select: {
        id: true,
        authorId: true,
        version: true,
        title: true,
        body: true,
        codeSnippet: true,
      },
    });
  }

  async lockAnswer(id: string): Promise<AnswerText | null> {
    await this.tx.$queryRaw`SELECT id FROM answers WHERE id = ${id}::uuid FOR UPDATE`;
    return this.tx.answer.findFirst({
      where: { id, hiddenAt: null },
      select: { id: true, authorId: true, version: true, body: true },
    });
  }

  /** Rien n'est perdu : l'ancienne version est archivée (plan B de 04 § 5). */
  async archive(
    contentType: 'question' | 'answer',
    contentId: string,
    version: number,
    body: Record<string, unknown>,
  ): Promise<void> {
    await this.tx.contentRevision.create({
      data: { contentType, contentId, version, body: body as Prisma.InputJsonValue },
    });
  }

  saveQuestion(
    id: string,
    fields: { title: string; body: string; codeSnippet: string | null },
    version: number,
  ): Promise<QuestionText> {
    return this.tx.question.update({
      where: { id },
      data: { ...fields, version },
      select: {
        id: true,
        authorId: true,
        version: true,
        title: true,
        body: true,
        codeSnippet: true,
      },
    });
  }

  saveAnswer(id: string, body: string, version: number): Promise<AnswerText> {
    return this.tx.answer.update({
      where: { id },
      data: { body, version },
      select: { id: true, authorId: true, version: true, body: true },
    });
  }
}
