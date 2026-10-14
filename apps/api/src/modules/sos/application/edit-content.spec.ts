import { describe, expect, it } from 'vitest';
import {
  type AnswerText,
  ContentNotFoundError,
  type EditWriter,
  NotContentAuthorError,
  type QuestionText,
  VersionConflictError,
} from '../domain/edit';
import { EditContent } from './edit-content';

class MemoryWriter implements EditWriter {
  archived: Array<{ type: string; version: number; body: Record<string, unknown> }> = [];
  constructor(
    public question: QuestionText | null = {
      id: 'q1',
      authorId: 'awa',
      version: 2,
      title: 'Titre initial assez long',
      body: 'Corps initial',
      codeSnippet: 'docker ps',
    },
    public answer: AnswerText | null = {
      id: 'a1',
      authorId: 'moussa',
      version: 1,
      body: 'Réponse',
    },
  ) {}
  async lockQuestion() {
    return this.question;
  }
  async lockAnswer() {
    return this.answer;
  }
  async archive(
    type: 'question' | 'answer',
    _id: string,
    version: number,
    body: Record<string, unknown>,
  ) {
    this.archived.push({ type, version, body });
  }
  async saveQuestion(
    id: string,
    fields: Omit<QuestionText, 'id' | 'authorId' | 'version'>,
    version: number,
  ) {
    this.question = { id, authorId: 'awa', version, ...fields };
    return this.question;
  }
  async saveAnswer(id: string, body: string, version: number) {
    this.answer = { id, authorId: 'moussa', version, body };
    return this.answer;
  }
}

const edit = new EditContent();

describe('EditContent (O4)', () => {
  it('modifie la question, archive l’ancienne version, masque les secrets, version + 1', async () => {
    const writer = new MemoryWriter();
    const out = await edit.question(writer, {
      questionId: 'q1',
      actorId: 'awa',
      baseVersion: 2,
      body: 'Nouveau corps, password: "Sup3rSecret!"',
    });
    expect(out.question).toMatchObject({
      version: 3,
      title: 'Titre initial assez long',
      codeSnippet: 'docker ps',
    });
    expect(out.question.body).not.toContain('Sup3rSecret');
    expect(out.secretsMasked).toBe(1);
    expect(writer.archived).toEqual([
      {
        type: 'question',
        version: 2,
        body: {
          title: 'Titre initial assez long',
          body: 'Corps initial',
          codeSnippet: 'docker ps',
        },
      },
    ]);
  });

  it('extrait vidé : null', async () => {
    const writer = new MemoryWriter();
    const out = await edit.question(writer, {
      questionId: 'q1',
      actorId: 'awa',
      baseVersion: 2,
      codeSnippet: ' ',
    });
    expect(out.question.codeSnippet).toBeNull();
  });

  it('version différente : conflit avec la version serveur, rien n’est écrit', async () => {
    const writer = new MemoryWriter();
    const err = await edit
      .question(writer, {
        questionId: 'q1',
        actorId: 'awa',
        baseVersion: 1,
        title: 'Un autre titre long',
      })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(VersionConflictError);
    expect((err as VersionConflictError).server).toEqual({
      version: 2,
      title: 'Titre initial assez long',
      body: 'Corps initial',
      codeSnippet: 'docker ps',
    });
    expect(writer.archived).toHaveLength(0);
  });

  it('seul l’auteur modifie ; contenu absent : introuvable', async () => {
    await expect(
      edit.answer(new MemoryWriter(), {
        answerId: 'a1',
        actorId: 'awa',
        baseVersion: 1,
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(NotContentAuthorError);
    await expect(
      edit.answer(new MemoryWriter(null, null), {
        answerId: 'a1',
        actorId: 'moussa',
        baseVersion: 1,
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(ContentNotFoundError);
  });

  it('modifie la réponse et archive l’ancienne', async () => {
    const writer = new MemoryWriter();
    const out = await edit.answer(writer, {
      answerId: 'a1',
      actorId: 'moussa',
      baseVersion: 1,
      body: 'Corrigée',
    });
    expect(out.answer).toMatchObject({ version: 2, body: 'Corrigée' });
    expect(writer.archived[0]).toEqual({ type: 'answer', version: 1, body: { body: 'Réponse' } });
  });
});
