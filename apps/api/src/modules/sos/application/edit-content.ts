import { maskSecrets } from '@devhub/core';
import { type AnswerText, type EditWriter, type QuestionText, assertCanEdit } from '../domain/edit';

/**
 * O4 : modifier sa question ou sa réponse. La version doit correspondre à celle du client,
 * sinon VersionConflictError porte la version serveur pour l'écran de conflit. L'ancienne
 * version est archivée ; les secrets sont masqués comme à la création.
 */
export class EditContent {
  async question(
    writer: EditWriter,
    input: {
      questionId: string;
      actorId: string;
      baseVersion: number;
      title?: string;
      body?: string;
      codeSnippet?: string | null;
    },
  ): Promise<{ question: QuestionText; secretsMasked: number }> {
    const current = await writer.lockQuestion(input.questionId);
    assertCanEdit(current, input.actorId, input.baseVersion, (q) => ({
      title: q.title,
      body: q.body,
      codeSnippet: q.codeSnippet,
    }));
    await writer.archive('question', current.id, current.version, {
      title: current.title,
      body: current.body,
      codeSnippet: current.codeSnippet,
    });

    let masked = 0;
    const mask = (text: string) => {
      const r = maskSecrets(text);
      masked += r.count;
      return r.text;
    };
    // Extrait : inchangé s'il n'est pas fourni, effacé s'il est vide, masqué sinon.
    const code =
      input.codeSnippet === undefined
        ? current.codeSnippet
        : input.codeSnippet?.trim()
          ? mask(input.codeSnippet)
          : null;
    const question = await writer.saveQuestion(
      current.id,
      {
        title: input.title !== undefined ? mask(input.title) : current.title,
        body: input.body !== undefined ? mask(input.body) : current.body,
        codeSnippet: code,
      },
      current.version + 1,
    );
    return { question, secretsMasked: masked };
  }

  async answer(
    writer: EditWriter,
    input: { answerId: string; actorId: string; baseVersion: number; body: string },
  ): Promise<{ answer: AnswerText; secretsMasked: number }> {
    const current = await writer.lockAnswer(input.answerId);
    assertCanEdit(current, input.actorId, input.baseVersion, (a) => ({ body: a.body }));
    await writer.archive('answer', current.id, current.version, { body: current.body });
    const masked = maskSecrets(input.body);
    const answer = await writer.saveAnswer(current.id, masked.text, current.version + 1);
    return { answer, secretsMasked: masked.count };
  }
}
