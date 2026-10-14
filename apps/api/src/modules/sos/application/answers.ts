import { maskSecrets } from '@devhub/core';
import {
  AnswerNotFoundError,
  QuestionClosedError,
  QuestionNotFoundError,
  assertCanVote,
  decideAccept,
} from '../domain/answer';
import type {
  AnswerWriter,
  MatchingAnswerPort,
  NotifierPort,
  ReputationPort,
  StoredAnswer,
  XpAward,
} from '../domain/ports';

const NO_XP: XpAward = { events: [], withheld: [] };

export interface PostAnswerOutput {
  answer: StoredAnswer;
  secretsMasked: number;
  created: boolean;
}

export interface VoteOutput {
  helpfulCount: number;
  counted: boolean;
  xp: XpAward;
}

export interface AcceptOutput {
  questionId: string;
  answerId: string;
  resolvedAt: Date;
  xp: XpAward;
  /** false si cette réponse était déjà validée (rejeu). */
  changed: boolean;
}

/**
 * S4 : répondre, voter « utile », valider. Chaque action tourne dans la transaction de la
 * requête : la validation, les Proof XP et la notification sont atomiques (02-backend.md).
 */
export class Answers {
  constructor(
    private readonly reputation: ReputationPort,
    private readonly notifier: NotifierPort,
    private readonly matching: MatchingAnswerPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async post(
    writer: AnswerWriter,
    tx: unknown,
    input: { questionId: string; authorId: string; clientId: string; body: string },
  ): Promise<PostAnswerOutput> {
    await writer.lockAuthor(input.authorId);
    const existing = await writer.findAnswerByClientId(input.authorId, input.clientId);
    if (existing) return { answer: existing, secretsMasked: 0, created: false };

    const question = await writer.findQuestion(input.questionId);
    if (!question) throw new QuestionNotFoundError();
    if (question.status === 'closed') throw new QuestionClosedError();

    // §6.1 et O9 : secrets masqués avant tout stockage, côté serveur aussi.
    const masked = maskSecrets(input.body);
    const answer = await writer.createAnswer({ ...input, body: masked.text });
    await this.matching.markAnswered(question.id, input.authorId, answer.createdAt, tx);
    if (question.authorId !== input.authorId) {
      await this.notifier.notify(
        [
          {
            userId: question.authorId,
            type: 'answer.created',
            payload: {
              questionId: question.id,
              answerId: answer.id,
              title: question.title,
              by: answer.author.handle,
            },
          },
        ],
        tx,
      );
    }
    return { answer, secretsMasked: masked.count, created: true };
  }

  async vote(
    writer: AnswerWriter,
    tx: unknown,
    input: { answerId: string; voterId: string },
  ): Promise<VoteOutput> {
    const answer = await writer.findAnswer(input.answerId);
    if (!answer) throw new AnswerNotFoundError();
    assertCanVote(answer, input.voterId);
    const question = await writer.findQuestion(answer.questionId);
    if (!question) throw new AnswerNotFoundError();

    const counted = await writer.addVote(answer.id, input.voterId);
    const xp = counted
      ? await this.reputation.helpfulVote(
          {
            answerId: answer.id,
            helperId: answer.authorId,
            voterId: input.voterId,
            voterCreatedAt: await writer.userCreatedAt(input.voterId),
            tagIds: question.tagIds,
          },
          tx,
        )
      : NO_XP;
    return { helpfulCount: await writer.helpfulCount(answer.id), counted, xp };
  }

  async accept(
    writer: AnswerWriter,
    tx: unknown,
    input: { answerId: string; actorId: string },
  ): Promise<AcceptOutput> {
    const answer = await writer.findAnswer(input.answerId);
    if (!answer) throw new AnswerNotFoundError();
    const question = await writer.lockQuestion(answer.questionId);
    if (!question) throw new AnswerNotFoundError();

    const now = this.now();
    const decision = decideAccept(question, answer, input.actorId, now);
    if (decision.kind === 'already_accepted') {
      return {
        questionId: question.id,
        answerId: answer.id,
        resolvedAt: now,
        xp: NO_XP,
        changed: false,
      };
    }

    await writer.markAccepted(question.id, answer.id, now);
    // XP dans la même transaction : jamais de validation sans XP, ni l'inverse.
    const xp = await this.reputation.acceptedAnswer(
      {
        answerId: answer.id,
        questionId: question.id,
        helperId: answer.authorId,
        authorId: question.authorId,
        tagIds: question.tagIds,
        minutesToAccept: decision.minutesToAccept,
      },
      tx,
    );
    if (answer.authorId !== question.authorId) {
      const points = xp.events
        .filter((e) => e.userId === answer.authorId)
        .reduce((sum, e) => sum + e.points, 0);
      await this.notifier.notify(
        [
          {
            userId: answer.authorId,
            type: 'answer.accepted',
            payload: {
              questionId: question.id,
              answerId: answer.id,
              title: question.title,
              points,
            },
          },
        ],
        tx,
      );
    }
    return { questionId: question.id, answerId: answer.id, resolvedAt: now, xp, changed: true };
  }
}
