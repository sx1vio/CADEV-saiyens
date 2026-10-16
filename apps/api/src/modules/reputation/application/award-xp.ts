import { XP_LIMITS, type XpKind, startOfUtcDay } from '@devhub/core';
import { type GainRequest, planGain } from '../domain/award-plan';
import { SelfVoteError, type WithheldReason, XpEventNotRevertableError } from '../domain/errors';
import type { LedgerUnitOfWork, StoredXpEvent, XpLedger } from '../domain/ports';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface Withheld {
  userId: string;
  kind: XpKind;
  reason: WithheldReason;
}

export interface AwardResult {
  events: StoredXpEvent[];
  withheld: Withheld[];
}

// X1 et X2 : attribution des Proof XP selon le barème (§6.3) et ses garde-fous.
// API publique du module reputation, appelée par sos et rooms dans leur propre transaction.
export class AwardXp {
  constructor(
    private readonly uow: LedgerUnitOfWork,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** S4 : l'auteur valide une réponse. +10 au répondant (+3 si < 15 min), +1 à l'auteur. */
  acceptedAnswer(
    input: {
      answerId: string;
      questionId: string;
      helperId: string;
      authorId: string;
      tagIds: string[];
      minutesToAccept: number;
    },
    tx?: unknown,
  ): Promise<AwardResult> {
    return this.uow.run(async (ledger) => {
      const result = empty();
      const now = this.now();
      const { answerId, helperId, authorId, tagIds } = input;

      if (helperId === authorId) {
        result.withheld.push({ userId: helperId, kind: 'answer_accepted', reason: 'self' });
      } else {
        await ledger.lockUser(helperId);
        const gain: GainRequest = {
          userId: helperId,
          kind: 'answer_accepted',
          sourceType: 'answer',
          sourceId: answerId,
          tagIds,
          counterpartId: authorId,
        };
        if (await ledger.hasGain(helperId, 'answer_accepted', 'answer', answerId)) {
          result.withheld.push({
            userId: helperId,
            kind: 'answer_accepted',
            reason: 'already_awarded',
          });
        } else if (
          (await ledger.countSourcesWithCounterpart(
            helperId,
            'answer_accepted',
            authorId,
            new Date(now.getTime() - WEEK_MS),
          )) >= XP_LIMITS.validationsPerPairPerWeek
        ) {
          // La question est bien résolue, mais la validation ne rapporte rien au répondant.
          result.withheld.push({
            userId: helperId,
            kind: 'answer_accepted',
            reason: 'pair_weekly_limit',
          });
        } else {
          await this.grant(ledger, gain, now, result);
          if (input.minutesToAccept < XP_LIMITS.fastBonusMinutes) {
            await this.grant(ledger, { ...gain, kind: 'answer_fast_bonus' }, now, result);
          }
        }
      }

      await ledger.lockUser(authorId);
      if (!(await ledger.hasGain(authorId, 'question_resolved', 'question', input.questionId))) {
        await this.grant(
          ledger,
          {
            userId: authorId,
            kind: 'question_resolved',
            sourceType: 'question',
            sourceId: input.questionId,
            tagIds: [],
            counterpartId: helperId,
          },
          now,
          result,
        );
      }
      return result;
    }, tx);
  }

  /** S4 : un pair juge une réponse utile. +2 au répondant, 5 votes rémunérés au plus par réponse. */
  helpfulVote(
    input: {
      answerId: string;
      helperId: string;
      voterId: string;
      voterCreatedAt: Date;
      tagIds: string[];
    },
    tx?: unknown,
  ): Promise<AwardResult> {
    if (input.voterId === input.helperId)
      return Promise.reject(new SelfVoteError('Vote pour sa propre réponse'));
    return this.uow.run(async (ledger) => {
      const result = empty();
      const now = this.now();
      const kind = 'answer_helpful_vote';
      const withhold = (reason: WithheldReason) =>
        result.withheld.push({ userId: input.helperId, kind, reason });

      if (
        now.getTime() - input.voterCreatedAt.getTime() <
        XP_LIMITS.minVoterAccountAgeHours * HOUR_MS
      ) {
        withhold('voter_too_new');
        return result;
      }
      await ledger.lockUser(input.helperId);
      if (await ledger.hasGain(input.helperId, kind, 'answer', input.answerId, input.voterId)) {
        withhold('already_awarded');
      } else if (
        (await ledger.countCounterparts(input.helperId, kind, 'answer', input.answerId)) >=
        XP_LIMITS.helpfulVotesPerAnswer
      ) {
        withhold('vote_cap');
      } else {
        await this.grant(
          ledger,
          {
            userId: input.helperId,
            kind,
            sourceType: 'answer',
            sourceId: input.answerId,
            tagIds: input.tagIds,
            counterpartId: input.voterId,
          },
          now,
          result,
        );
      }
      return result;
    }, tx);
  }

  /** R8 : contribution acceptée dans une salle. +15 au contributeur. */
  taskCompleted(
    input: { taskId: string; contributorId: string; ownerId: string; tagIds: string[] },
    tx?: unknown,
  ): Promise<AwardResult> {
    return this.single(
      {
        userId: input.contributorId,
        kind: 'task_completed',
        sourceType: 'task',
        sourceId: input.taskId,
        tagIds: input.tagIds,
        counterpartId: input.ownerId,
      },
      tx,
    );
  }

  /** R6 : revue de code confirmée par le demandeur. +8 au relecteur. */
  codeReviewGiven(
    input: { feedbackRequestId: string; reviewerId: string; requesterId: string; tagIds: string[] },
    tx?: unknown,
  ): Promise<AwardResult> {
    return this.single(
      {
        userId: input.reviewerId,
        kind: 'code_review_given',
        sourceType: 'feedback_request',
        sourceId: input.feedbackRequestId,
        tagIds: input.tagIds,
        counterpartId: input.requesterId,
      },
      tx,
    );
  }

  /** Projet partagé avec une démo en ligne. +5, une seule fois par projet. */
  projectDemoShared(
    input: { roomId: string; ownerId: string; tagIds: string[] },
    tx?: unknown,
  ): Promise<AwardResult> {
    return this.single(
      {
        userId: input.ownerId,
        kind: 'project_demo_shared',
        sourceType: 'room',
        sourceId: input.roomId,
        tagIds: input.tagIds,
        counterpartId: null,
      },
      tx,
    );
  }

  /** Idée A : application de la salle vérifiée en production sur Systalink. +10, une seule fois par salle. */
  deploymentVerified(
    input: { roomId: string; ownerId: string; tagIds: string[] },
    tx?: unknown,
  ): Promise<AwardResult> {
    return this.single(
      {
        userId: input.ownerId,
        kind: 'deployment_verified',
        sourceType: 'room',
        sourceId: input.roomId,
        tagIds: input.tagIds,
        counterpartId: null,
      },
      tx,
    );
  }

  /** X2 : un abus confirmé produit un événement d'annulation, jamais une suppression. */
  revert(eventId: string, reason: string, tx?: unknown): Promise<StoredXpEvent> {
    return this.uow.run(async (ledger) => {
      const event = await ledger.find(eventId);
      if (!event || event.kind === 'revert' || event.revertedAt) {
        throw new XpEventNotRevertableError(`Événement ${eventId} introuvable ou déjà annulé`);
      }
      await ledger.lockUser(event.userId);
      const now = this.now();
      const revert = await ledger.insertRevert(event, reason, now);
      await ledger.markReverted(event.id, now);
      if (event.tagId) await ledger.applyToSkill(event.userId, event.tagId, -event.points);
      return revert;
    }, tx);
  }

  private single(gain: GainRequest, tx?: unknown): Promise<AwardResult> {
    return this.uow.run(async (ledger) => {
      const result = empty();
      if (gain.userId === gain.counterpartId) {
        result.withheld.push({ userId: gain.userId, kind: gain.kind, reason: 'self' });
        return result;
      }
      await ledger.lockUser(gain.userId);
      if (await ledger.hasGain(gain.userId, gain.kind, gain.sourceType, gain.sourceId)) {
        result.withheld.push({ userId: gain.userId, kind: gain.kind, reason: 'already_awarded' });
        return result;
      }
      await this.grant(ledger, gain, this.now(), result);
      return result;
    }, tx);
  }

  private async grant(
    ledger: XpLedger,
    gain: GainRequest,
    now: Date,
    result: AwardResult,
  ): Promise<void> {
    const plan = planGain(gain, await ledger.cappedPointsSince(gain.userId, startOfUtcDay(now)));
    if (plan.granted < plan.requested)
      result.withheld.push({ userId: gain.userId, kind: gain.kind, reason: 'daily_cap' });
    if (plan.events.length === 0) return;
    const stored = await ledger.insert(plan.events, now);
    for (const event of stored) {
      if (event.tagId) await ledger.applyToSkill(event.userId, event.tagId, event.points);
    }
    result.events.push(...stored);
  }
}

function empty(): AwardResult {
  return { events: [], withheld: [] };
}
