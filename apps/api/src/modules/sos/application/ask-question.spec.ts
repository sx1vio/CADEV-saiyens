import { describe, expect, it } from 'vitest';
import type { NewQuestion, QuestionWriter, StoredQuestion } from '../domain/ports';
import { TooManyQuestionsError, UnknownTagsError } from '../domain/question';
import { AskQuestion, type AskQuestionInput } from './ask-question';

const now = new Date('2026-10-14T12:00:00Z');

class MemoryWriter implements QuestionWriter {
  created: NewQuestion[] = [];
  constructor(
    private readonly recent: Date[] = [],
    private readonly existing: StoredQuestion | null = null,
  ) {}
  locks: string[] = [];
  async lockAuthor(authorId: string) {
    this.locks.push(authorId);
  }
  async findByClientId() {
    return this.existing;
  }
  async createdSince() {
    return this.recent;
  }
  async tagIdsBySlug(slugs: string[]) {
    const known = new Map([
      ['docker', 't-docker'],
      ['nginx', 't-nginx'],
    ]);
    return new Map(slugs.filter((s) => known.has(s)).map((s) => [s, known.get(s)!]));
  }
  async create(q: NewQuestion): Promise<StoredQuestion> {
    this.created.push(q);
    return {
      id: 'q1',
      clientId: q.clientId,
      status: 'open',
      aiStatus: 'pending',
      version: 1,
      createdAt: now,
      author: { handle: 'awa', displayName: 'Awa', avatarUrl: null, isDemo: false },
    };
  }
}

const input = (over: Partial<AskQuestionInput> = {}): AskQuestionInput => ({
  authorId: 'awa',
  clientId: 'c1',
  title: 'nginx renvoie 502 derrière Docker',
  body: 'Mot de passe : password: "Sup3rSecret!"',
  codeSnippet: null,
  tagSlugs: ['docker', 'nginx', 'docker'],
  urgency: 'high',
  lang: 'fr',
  ...over,
});

const ask = new AskQuestion(() => now);

describe('AskQuestion (S1)', () => {
  it('publie la question avec ses étiquettes, secrets masqués', async () => {
    const writer = new MemoryWriter();
    const out = await ask.execute(writer, input());

    expect(out.created).toBe(true);
    expect(writer.locks).toEqual(['awa']);
    expect(out.secretsMasked).toBe(1);
    expect(writer.created[0]).toMatchObject({ tagIds: ['t-docker', 't-nginx'], urgency: 'high' });
    expect(writer.created[0]?.body).not.toContain('Sup3rSecret');
  });

  it('même clientId déjà publié : renvoie la question existante, sans doublon', async () => {
    const existing = await new MemoryWriter().create({ ...input(), tagIds: [] } as NewQuestion);
    const writer = new MemoryWriter([], existing);
    const out = await ask.execute(writer, input());
    expect(out).toMatchObject({ created: false, question: { id: 'q1' } });
    expect(writer.created).toHaveLength(0);
  });

  it('étiquette inconnue : refus explicite', async () => {
    await expect(
      ask.execute(new MemoryWriter(), input({ tagSlugs: ['docker', 'cobol'] })),
    ).rejects.toEqual(new UnknownTagsError(['cobol']));
  });

  it('10 questions dans l’heure : TooManyQuestionsError avec le délai', async () => {
    const recent = Array.from({ length: 10 }, (_, i) => new Date(now.getTime() - (i + 1) * 60_000));
    const err = await ask.execute(new MemoryWriter(recent), input()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TooManyQuestionsError);
    expect((err as TooManyQuestionsError).retryAfterSeconds).toBe(50 * 60);
  });
});
