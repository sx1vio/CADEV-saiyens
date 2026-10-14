import type { MatchCandidate } from '@devhub/core';
import { describe, expect, it } from 'vitest';
import type { MatchingQuestion, MatchingStore, NewMatchEvent } from '../domain/ports';
import { ClaimQuestion, NotSolicitedError, RunWave } from './run-wave';

const now = new Date('2026-10-14T12:00:00Z');

const helper = (userId: string, over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  userId,
  acceptedAnswerTagIds: [],
  skillTagIds: ['t-docker'],
  githubSignalByTag: { 't-docker': 10 },
  canHelpTagIds: [],
  offsetMinutes: 0,
  availability: 'none',
  totalXp: 0,
  languages: ['fr'],
  recentRequests: 0,
  lastRequestedAt: null,
  ...over,
});

class MemoryStore implements MatchingStore {
  events: NewMatchEvent[] = [];
  escalated = false;
  constructor(
    public question: MatchingQuestion | null,
    private readonly pool: MatchCandidate[],
    private readonly accepted = 0,
  ) {}
  async findQuestion() {
    return this.question;
  }
  async acceptedAnswersOnPlatform() {
    return this.accepted;
  }
  async candidates() {
    return this.pool;
  }
  async recordWave(events: NewMatchEvent[], notify: (tx: unknown) => Promise<void>) {
    this.events.push(...events);
    await notify('tx');
  }
  async markEscalated() {
    this.escalated = true;
  }
}

const question = (over: Partial<MatchingQuestion> = {}): MatchingQuestion => ({
  id: 'q1',
  title: 'nginx 502',
  authorId: 'awa',
  authorIsDemo: false,
  authorTimezone: 'Africa/Abidjan',
  status: 'open',
  lang: 'fr',
  tags: [{ id: 't-docker', label: 'Docker' }],
  answerCount: 0,
  activeClaim: false,
  wavesDone: [],
  ...over,
});

const notifier = () => {
  const sent: Array<{ userId: string; payload: Record<string, unknown>; tx: unknown }> = [];
  return {
    sent,
    notify: async (n: Array<{ userId: string; payload: Record<string, unknown> }>, tx?: unknown) =>
      void sent.push(...n.map((x) => ({ ...x, tx }))),
  };
};

describe('RunWave (S3, X4)', () => {
  it('vague 1 : 3 aidants, sollicitations et notifications dans la même transaction', async () => {
    const store = new MemoryStore(
      question(),
      ['a', 'b', 'c', 'd'].map((id) => helper(id)),
    );
    const n = notifier();
    const outcome = await new RunWave(store, n, () => now).first('q1');

    expect(outcome).toMatchObject({ kind: 'matched', regime: 'cold_start' });
    expect(store.events.map((e) => [e.helperId, e.rank, e.wave])).toEqual([
      ['a', 1, 1],
      ['b', 2, 1],
      ['c', 3, 1],
    ]);
    // Raisons lisibles : libellé de l'étiquette, jamais un pourcentage.
    expect(store.events[0]?.reasons[0]).toEqual({
      code: 'github_repos',
      params: { count: 2, tag: 'Docker' },
    });
    expect(n.sent.map((s) => s.userId)).toEqual(['a', 'b', 'c']);
    expect(n.sent.every((s) => s.tx === 'tx')).toBe(true);
    expect(n.sent[0]?.payload).toMatchObject({ questionId: 'q1', title: 'nginx 502', wave: 1 });
  });

  it('moins de 3 éligibles : ouverte à toute la stack', async () => {
    const store = new MemoryStore(question(), [
      helper('a'),
      helper('z', { skillTagIds: ['t-go'] }),
    ]);
    const outcome = await new RunWave(store, notifier(), () => now).first('q1');
    expect(outcome.kind).toBe('open_to_stack');
    expect(store.events).toHaveLength(1);
  });

  it('aucun éligible : rien n’est écrit', async () => {
    const store = new MemoryStore(question(), []);
    expect((await new RunWave(store, notifier(), () => now).first('q1')).kind).toBe(
      'open_to_stack',
    );
    expect(store.events).toHaveLength(0);
  });

  it.each([
    [null, 'not_found'],
    [question({ status: 'resolved' }), 'not_open'],
    [question({ wavesDone: [1] }), 'already_sent'],
  ] as const)('question absente ou fermée : vague sautée', async (q, reason) => {
    const outcome = await new RunWave(
      new MemoryStore(q, [helper('a')]),
      notifier(),
      () => now,
    ).first('q1');
    expect(outcome).toEqual({ kind: 'skipped', reason });
  });

  it.each([
    [question({ answerCount: 1 }), 'answered'],
    [question({ activeClaim: true }), 'claimed'],
  ] as const)('escalade sautée si quelqu’un a répondu ou s’en occupe', async (q, reason) => {
    const store = new MemoryStore(q, [helper('a')]);
    expect(await new RunWave(store, notifier(), () => now).escalate('q1')).toEqual({
      kind: 'skipped',
      reason,
    });
    expect(store.escalated).toBe(false);
  });

  it('escalade : vague 2, question marquée', async () => {
    const store = new MemoryStore(question(), [helper('e')], 80);
    const outcome = await new RunWave(store, notifier(), () => now).escalate('q1');
    expect(outcome).toMatchObject({ kind: 'open_to_stack', regime: 'normal' });
    expect(store.events[0]).toMatchObject({ helperId: 'e', wave: 2, regime: 'normal' });
    expect(store.escalated).toBe(true);
  });
});

describe('ClaimQuestion (S11)', () => {
  it('réservé aux aidants sollicités', async () => {
    const claim = new ClaimQuestion(
      { claim: async (_q, helperId, at) => (helperId === 'a' ? { claimedAt: at } : null) },
      () => now,
    );
    expect(await claim.execute('q1', 'a')).toEqual({ claimedAt: now });
    await expect(claim.execute('q1', 'z')).rejects.toBeInstanceOf(NotSolicitedError);
  });
});
