import { PAIR_LIMITS } from '@devhub/contracts';
import { QuestionClosedError, QuestionNotFoundError } from '../domain/answer';
import {
  OwnQuestionPairError,
  PairAlreadyProposedError,
  PairNotFoundError,
  PairRecentlyDeclinedError,
  type PairStatus,
  assertCanRespond,
  assertValidProposal,
} from '../domain/pair';

export interface PairPerson {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  isDemo: boolean;
}

export interface PairSessionRecord {
  id: string;
  questionId: string;
  host: PairPerson;
  guest: PairPerson;
  startsAt: Date;
  videoLink: string;
  status: PairStatus;
  createdAt: Date;
}

export interface PairStore {
  findQuestion(
    questionId: string,
  ): Promise<{ id: string; authorId: string; title: string; status: string } | null>;
  /** Une proposition encore sans réponse du même aidant sur la même question. */
  hasPendingProposal(questionId: string, hostId: string): Promise<boolean>;
  /** Un refus de cet aidant sur cette question depuis `since` (date de réponse, sinon de proposition). */
  declinedSince(questionId: string, hostId: string, since: Date): Promise<boolean>;
  create(input: {
    questionId: string;
    hostId: string;
    guestId: string;
    startsAt: Date;
    videoLink: string;
  }): Promise<PairSessionRecord>;
  /**
   * Avec verrou de ligne : deux réponses simultanées ne passent pas toutes les deux. null si la
   * session n'existe pas ou si sa question est masquée par la modération.
   */
  findForUpdate(pairId: string): Promise<PairSessionRecord | null>;
  setStatus(pairId: string, status: PairStatus, respondedAt: Date): Promise<PairSessionRecord>;
  findQuestionTitle(questionId: string): Promise<string>;
}

export interface PairNotifierPort {
  notify(
    notifications: Array<{
      userId: string;
      type: 'pair.proposed' | 'pair.answered';
      payload: Record<string, unknown>;
    }>,
    tx?: unknown,
  ): Promise<void>;
}

/**
 * S5 : un aidant propose un créneau et un lien de visio à l'auteur d'une question ouverte ;
 * l'auteur accepte ou refuse. Chaque action et sa notification tiennent dans la même transaction.
 */
export class PairSessions {
  constructor(
    private readonly notifier: PairNotifierPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async propose(
    store: PairStore,
    tx: unknown,
    input: { questionId: string; hostId: string; startsAt: Date; videoLink: string },
  ): Promise<PairSessionRecord> {
    const question = await store.findQuestion(input.questionId);
    if (!question) throw new QuestionNotFoundError();
    if (question.status !== 'open') throw new QuestionClosedError();
    if (question.authorId === input.hostId) throw new OwnQuestionPairError();
    assertValidProposal(input.startsAt, input.videoLink, this.now());
    if (await store.hasPendingProposal(question.id, input.hostId)) {
      throw new PairAlreadyProposedError();
    }
    // Un refus n'est pas une invitation à insister : 24 h avant de reproposer.
    const cooldown = PAIR_LIMITS.declineCooldownHours * 60 * 60 * 1000;
    const since = new Date(this.now().getTime() - cooldown);
    if (await store.declinedSince(question.id, input.hostId, since)) {
      throw new PairRecentlyDeclinedError();
    }

    const pair = await store.create({ ...input, guestId: question.authorId });
    await this.notifier.notify(
      [
        {
          userId: question.authorId,
          type: 'pair.proposed',
          payload: {
            questionId: question.id,
            pairId: pair.id,
            title: question.title,
            startsAt: pair.startsAt.toISOString(),
            by: pair.host.handle,
            host: pair.host.displayName,
          },
        },
      ],
      tx,
    );
    return pair;
  }

  async respond(
    store: PairStore,
    tx: unknown,
    input: { pairId: string; actorId: string; accept: boolean },
  ): Promise<PairSessionRecord> {
    const pair = await store.findForUpdate(input.pairId);
    if (!pair) throw new PairNotFoundError();
    assertCanRespond({ guestId: pair.guest.id, status: pair.status }, input.actorId);

    const decision = input.accept ? 'accepted' : 'declined';
    const updated = await store.setStatus(pair.id, decision, this.now());
    await this.notifier.notify(
      [
        {
          userId: pair.host.id,
          type: 'pair.answered',
          payload: {
            questionId: pair.questionId,
            pairId: pair.id,
            title: await store.findQuestionTitle(pair.questionId),
            startsAt: pair.startsAt.toISOString(),
            decision,
            by: pair.guest.handle,
            guest: pair.guest.displayName,
          },
        },
      ],
      tx,
    );
    return updated;
  }
}
