import { describe, expect, it } from 'vitest';
import type { AnswerState, QuestionState } from '../domain/answer';
import type { AnswerWriter, NotifierPort, ReputationPort, StoredAnswer } from '../domain/ports';
import { Answers } from './answers';

const asked = new Date('2026-10-14T10:00:00Z');
const now = new Date(asked.getTime() + 8 * 60_000);
const author = (handle: string) => ({
  handle,
  displayName: handle,
  avatarUrl: null,
  isDemo: false,
});

class MemoryWriter implements AnswerWriter {
  question: QuestionState = {
    id: 'q1',
    authorId: 'awa',
    status: 'open',
    acceptedAnswerId: null,
    createdAt: asked,
    tagIds: ['t-docker'],
  };
  answers = new Map<string, AnswerState & { clientId: string; body: string }>();
  votes = new Set<string>();
  locks: string[] = [];
  async lockAuthor(id: string) {
    this.locks.push(`author:${id}`);
  }
  async lockQuestion() {
    this.locks.push('question');
    return this.question;
  }
  async findQuestion(id: string) {
    return id === this.question.id ? this.question : null;
  }
  async findAnswer(id: string) {
    return this.answers.get(id) ?? null;
  }
  async findAnswerByClientId(authorId: string, clientId: string) {
    const a = [...this.answers.values()].find(
      (x) => x.authorId === authorId && x.clientId === clientId,
    );
    return a ? this.stored(a.id) : null;
  }
  async createAnswer(a: { questionId: string; authorId: string; clientId: string; body: string }) {
    const id = `a${this.answers.size + 1}`;
    this.answers.set(id, { id, ...a });
    return this.stored(id);
  }
  async markAccepted(questionId: string, answerId: string) {
    this.question = { ...this.question, status: 'resolved', acceptedAnswerId: answerId };
  }
  async addVote(answerId: string, voterId: string) {
    const k = `${answerId}:${voterId}`;
    if (this.votes.has(k)) return false;
    this.votes.add(k);
    return true;
  }
  async helpfulCount(answerId: string) {
    return [...this.votes].filter((v) => v.startsWith(`${answerId}:`)).length;
  }
  async userCreatedAt() {
    return new Date('2026-09-01T00:00:00Z');
  }
  async handles(ids: string[]) {
    return new Map(ids.map((id) => [id, id]));
  }
  private stored(id: string): StoredAnswer {
    const a = this.answers.get(id)!;
    return {
      id,
      clientId: a.clientId,
      questionId: a.questionId,
      body: a.body,
      isAccepted: this.question.acceptedAnswerId === id,
      helpfulCount: 0,
      version: 1,
      createdAt: now,
      author: author(a.authorId),
    };
  }
}

const reputation = (): ReputationPort & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    async acceptedAnswer(input) {
      calls.push(`accepted:${input.helperId}:${input.minutesToAccept}`);
      return {
        events: [
          { userId: input.helperId, kind: 'answer_accepted', points: 10 },
          { userId: input.helperId, kind: 'answer_fast_bonus', points: 3 },
          { userId: input.authorId, kind: 'question_resolved', points: 1 },
        ],
        withheld: [],
      };
    },
    async helpfulVote(input) {
      calls.push(`vote:${input.voterId}`);
      return {
        events: [{ userId: input.helperId, kind: 'answer_helpful_vote', points: 2 }],
        withheld: [],
      };
    },
  };
};

const notifier = (): NotifierPort & {
  sent: Array<{ userId: string; type: string; payload: unknown }>;
} => {
  const sent: Array<{ userId: string; type: string; payload: unknown }> = [];
  return { sent, notify: async (n) => void sent.push(...n) };
};

const answered: string[] = [];
const matching = () => ({
  markAnswered: async (questionId: string, helperId: string) =>
    void answered.push(`${questionId}:${helperId}`),
});

describe('Answers (S4)', () => {
  it('répondre : secrets masqués, l’auteur de la question est notifié', async () => {
    const writer = new MemoryWriter();
    const n = notifier();
    const out = await new Answers(reputation(), n, matching(), () => now).post(writer, 'tx', {
      questionId: 'q1',
      authorId: 'moussa',
      clientId: 'c1',
      body: 'Essaie avec password: "Sup3rSecret!" retiré',
    });
    expect(out).toMatchObject({ created: true, secretsMasked: 1 });
    expect(out.answer.body).not.toContain('Sup3rSecret');
    expect(n.sent).toEqual([
      {
        userId: 'awa',
        type: 'answer.created',
        payload: { questionId: 'q1', answerId: 'a1', by: 'moussa' },
      },
    ]);
    expect(writer.locks).toEqual(['author:moussa']);
    expect(answered).toContain('q1:moussa');
  });

  it('répondre deux fois avec le même clientId : une seule réponse', async () => {
    const writer = new MemoryWriter();
    const answers = new Answers(reputation(), notifier(), matching(), () => now);
    const input = { questionId: 'q1', authorId: 'moussa', clientId: 'c1', body: 'b' };
    await answers.post(writer, 'tx', input);
    expect((await answers.post(writer, 'tx', input)).created).toBe(false);
    expect(writer.answers.size).toBe(1);
  });

  it('valider : question résolue, XP dans la même transaction, répondant notifié', async () => {
    const writer = new MemoryWriter();
    const rep = reputation();
    const n = notifier();
    const answers = new Answers(rep, n, matching(), () => now);
    await answers.post(writer, 'tx', {
      questionId: 'q1',
      authorId: 'moussa',
      clientId: 'c1',
      body: 'b',
    });

    const out = await answers.accept(writer, 'tx', { answerId: 'a1', actorId: 'awa' });
    expect(out.changed).toBe(true);
    expect(writer.question).toMatchObject({ status: 'resolved', acceptedAnswerId: 'a1' });
    expect(rep.calls).toEqual(['accepted:moussa:8']);
    expect(n.sent.at(-1)).toEqual({
      userId: 'moussa',
      type: 'answer.accepted',
      payload: { questionId: 'q1', answerId: 'a1', points: 13 },
    });
    expect(writer.locks).toContain('question');

    // Rejeu de la validation : pas de second appel à la réputation.
    expect((await answers.accept(writer, 'tx', { answerId: 'a1', actorId: 'awa' })).changed).toBe(
      false,
    );
    expect(rep.calls).toHaveLength(1);
  });

  it('voter : compté une fois, XP au répondant', async () => {
    const writer = new MemoryWriter();
    const rep = reputation();
    const answers = new Answers(rep, notifier(), matching(), () => now);
    await answers.post(writer, 'tx', {
      questionId: 'q1',
      authorId: 'moussa',
      clientId: 'c1',
      body: 'b',
    });

    expect(await answers.vote(writer, 'tx', { answerId: 'a1', voterId: 'kwame' })).toMatchObject({
      counted: true,
      helpfulCount: 1,
    });
    expect(await answers.vote(writer, 'tx', { answerId: 'a1', voterId: 'kwame' })).toMatchObject({
      counted: false,
      helpfulCount: 1,
      xp: { events: [] },
    });
    expect(rep.calls).toEqual(['vote:kwame']);
  });
});
