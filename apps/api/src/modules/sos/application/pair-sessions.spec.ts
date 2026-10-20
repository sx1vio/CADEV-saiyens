import { isAllowedVideoLink } from '@devhub/contracts';
import { describe, expect, it } from 'vitest';
import { QuestionClosedError, QuestionNotFoundError } from '../domain/answer';
import {
  InvalidSlotError,
  NotPairGuestError,
  OwnQuestionPairError,
  PairAlreadyAnsweredError,
  PairAlreadyProposedError,
  type PairStatus,
  VideoLinkRejectedError,
} from '../domain/pair';
import {
  type PairNotifierPort,
  type PairPerson,
  type PairSessionRecord,
  PairSessions,
  type PairStore,
} from './pair-sessions';

const now = new Date('2026-10-20T10:00:00Z');
const inHours = (h: number) => new Date(now.getTime() + h * 3600_000);
const person = (id: string): PairPerson => ({
  id,
  handle: id,
  displayName: id.toUpperCase(),
  avatarUrl: null,
  isDemo: false,
});

class MemoryPairStore implements PairStore {
  pairs: PairSessionRecord[] = [];
  question = { id: 'q1', authorId: 'awa', title: 'nginx 502', status: 'open' };
  async findQuestion(id: string) {
    return id === this.question.id ? this.question : null;
  }
  async hasPendingProposal(questionId: string, hostId: string) {
    return this.pairs.some(
      (p) => p.questionId === questionId && p.host.id === hostId && p.status === 'proposed',
    );
  }
  async create(input: {
    questionId: string;
    hostId: string;
    guestId: string;
    startsAt: Date;
    videoLink: string;
  }) {
    const pair: PairSessionRecord = {
      id: `p${this.pairs.length + 1}`,
      questionId: input.questionId,
      host: person(input.hostId),
      guest: person(input.guestId),
      startsAt: input.startsAt,
      videoLink: input.videoLink,
      status: 'proposed',
      createdAt: now,
    };
    this.pairs.push(pair);
    return pair;
  }
  async findForUpdate(id: string) {
    return this.pairs.find((p) => p.id === id) ?? null;
  }
  async setStatus(id: string, status: PairStatus) {
    const pair = this.pairs.find((p) => p.id === id)!;
    pair.status = status;
    return pair;
  }
  async findQuestionTitle() {
    return this.question.title;
  }
}

const notifier = () => {
  const sent: Array<{ userId: string; type: string; payload: Record<string, unknown> }> = [];
  const port: PairNotifierPort = { notify: async (n) => void sent.push(...n) };
  return { sent, port };
};

const link = 'https://meet.jit.si/devhub-nginx';

describe('liens de visio acceptés (S5)', () => {
  it('https vers un service connu, avec une salle', () => {
    for (const ok of [
      link,
      'https://meet.google.com/abc-defg-hij',
      'https://us02web.zoom.us/j/123456789?pwd=x',
      'https://teams.microsoft.com/l/meetup-join/abc',
      'https://equipe.whereby.com/salle',
    ]) {
      expect(isAllowedVideoLink(ok), ok).toBe(true);
    }
  });

  it('refuse http, un service inconnu ou imité, un port, des identifiants ou une salle vide', () => {
    for (const bad of [
      'http://meet.jit.si/salle',
      'https://evil.example/meet.jit.si/salle',
      'https://meet.jit.si.evil.example/salle',
      'https://evilzoom.us/j/1',
      'https://meet.jit.si:8443/salle',
      'https://user:pass@meet.jit.si/salle',
      'https://meet.jit.si/',
      'javascript:alert(1)//meet.jit.si/x',
    ]) {
      expect(isAllowedVideoLink(bad), bad).toBe(false);
    }
  });
});

describe('PairSessions (S5)', () => {
  const run = (n = notifier()) => ({ n, pairs: new PairSessions(n.port, () => now) });

  it('un aidant propose un créneau : l’auteur est invité et notifié', async () => {
    const store = new MemoryPairStore();
    const { n, pairs } = run();
    const pair = await pairs.propose(store, 'tx', {
      questionId: 'q1',
      hostId: 'moussa',
      startsAt: inHours(2),
      videoLink: link,
    });
    expect(pair).toMatchObject({
      status: 'proposed',
      guest: { id: 'awa' },
      host: { id: 'moussa' },
    });
    expect(n.sent).toEqual([
      {
        userId: 'awa',
        type: 'pair.proposed',
        payload: expect.objectContaining({
          questionId: 'q1',
          pairId: 'p1',
          by: 'moussa',
          host: 'MOUSSA',
        }),
      },
    ]);
  });

  it('refuse sa propre question, une question fermée ou introuvable', async () => {
    const store = new MemoryPairStore();
    const { pairs } = run();
    const input = { questionId: 'q1', hostId: 'awa', startsAt: inHours(2), videoLink: link };
    await expect(pairs.propose(store, 'tx', input)).rejects.toBeInstanceOf(OwnQuestionPairError);
    store.question.status = 'resolved';
    await expect(pairs.propose(store, 'tx', { ...input, hostId: 'moussa' })).rejects.toBeInstanceOf(
      QuestionClosedError,
    );
    await expect(
      pairs.propose(store, 'tx', { ...input, hostId: 'moussa', questionId: 'q9' }),
    ).rejects.toBeInstanceOf(QuestionNotFoundError);
  });

  it('refuse un lien inconnu et un créneau passé ou à plus de 30 jours', async () => {
    const store = new MemoryPairStore();
    const { pairs } = run();
    const input = { questionId: 'q1', hostId: 'moussa', startsAt: inHours(2), videoLink: link };
    await expect(
      pairs.propose(store, 'tx', { ...input, videoLink: 'https://evil.example/x' }),
    ).rejects.toBeInstanceOf(VideoLinkRejectedError);
    await expect(
      pairs.propose(store, 'tx', { ...input, startsAt: inHours(-1) }),
    ).rejects.toBeInstanceOf(InvalidSlotError);
    await expect(
      pairs.propose(store, 'tx', { ...input, startsAt: inHours(31 * 24) }),
    ).rejects.toBeInstanceOf(InvalidSlotError);
    // Tolérance d'horloge : « maintenant » saisi il y a 2 minutes reste accepté.
    await expect(
      pairs.propose(store, 'tx', { ...input, startsAt: new Date(now.getTime() - 2 * 60_000) }),
    ).resolves.toMatchObject({ status: 'proposed' });
  });

  it('une seule proposition en attente par aidant et par question', async () => {
    const store = new MemoryPairStore();
    const { pairs } = run();
    const input = { questionId: 'q1', hostId: 'moussa', startsAt: inHours(2), videoLink: link };
    await pairs.propose(store, 'tx', input);
    await expect(pairs.propose(store, 'tx', input)).rejects.toBeInstanceOf(
      PairAlreadyProposedError,
    );
  });

  it('l’auteur accepte : l’aidant est notifié ; une seconde réponse est refusée', async () => {
    const store = new MemoryPairStore();
    const { n, pairs } = run();
    const pair = await pairs.propose(store, 'tx', {
      questionId: 'q1',
      hostId: 'moussa',
      startsAt: inHours(2),
      videoLink: link,
    });
    const accepted = await pairs.respond(store, 'tx', {
      pairId: pair.id,
      actorId: 'awa',
      accept: true,
    });
    expect(accepted.status).toBe('accepted');
    expect(n.sent.at(-1)).toEqual({
      userId: 'moussa',
      type: 'pair.answered',
      payload: expect.objectContaining({ decision: 'accepted', by: 'awa', title: 'nginx 502' }),
    });
    await expect(
      pairs.respond(store, 'tx', { pairId: pair.id, actorId: 'awa', accept: false }),
    ).rejects.toBeInstanceOf(PairAlreadyAnsweredError);
  });

  it('seul l’invité répond', async () => {
    const store = new MemoryPairStore();
    const { pairs } = run();
    const pair = await pairs.propose(store, 'tx', {
      questionId: 'q1',
      hostId: 'moussa',
      startsAt: inHours(2),
      videoLink: link,
    });
    await expect(
      pairs.respond(store, 'tx', { pairId: pair.id, actorId: 'moussa', accept: true }),
    ).rejects.toBeInstanceOf(NotPairGuestError);
  });
});
