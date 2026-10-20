import {
  MATCHING,
  type MatchReason,
  pickHelpers,
  regimeFor,
  timezoneOffsetMinutes,
} from '@devhub/core';
import type { MatchNotifier, MatchingStore, NewMatchEvent, WaveOutcome } from '../domain/ports';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * S3 et X4 : sollicite les 3 devs les plus adaptés, avec la raison du choix. La vague 1 suit la
 * création de la question ; la vague 2 (escalade) arrive 15 minutes plus tard si personne n'a
 * répondu ni ne s'en occupe (§6.1, S11).
 */
export class RunWave {
  constructor(
    private readonly store: MatchingStore,
    private readonly notifier: MatchNotifier,
    private readonly now: () => Date = () => new Date(),
    /** S10 : la traduction IA répond ; un dev qui ne parle pas la langue compte pour L = 0,5. */
    private readonly translationAvailable = false,
  ) {}

  first(questionId: string): Promise<WaveOutcome> {
    return this.run(questionId, 1);
  }

  async escalate(questionId: string): Promise<WaveOutcome> {
    const outcome = await this.run(questionId, 2);
    if (outcome.kind !== 'skipped') await this.store.markEscalated(questionId, this.now());
    return outcome;
  }

  private async run(questionId: string, wave: 1 | 2): Promise<WaveOutcome> {
    const now = this.now();
    const question = await this.store.findQuestion(questionId, now);
    if (!question) return { kind: 'skipped', reason: 'not_found' };
    if (question.status !== 'open') return { kind: 'skipped', reason: 'not_open' };
    if (question.wavesDone.includes(wave)) return { kind: 'skipped', reason: 'already_sent' };
    if (wave === 2 && question.answerCount > 0) return { kind: 'skipped', reason: 'answered' };
    if (wave === 2 && question.claimExpiresAt) {
      return { kind: 'skipped', reason: 'claimed', retryAt: question.claimExpiresAt };
    }

    const regime = regimeFor(await this.store.acceptedAnswersOnPlatform());
    const activeSince = new Date(now.getTime() - MATCHING.activeDays * DAY_MS);
    const candidates = await this.store.candidates(question, activeSince, now);
    const helpers = pickHelpers(
      {
        tagIds: question.tags.map((t) => t.id),
        lang: question.lang,
        authorOffsetMinutes: timezoneOffsetMinutes(question.authorTimezone, now),
      },
      candidates,
      regime,
      MATCHING.helpersPerWave,
      this.translationAvailable,
    );

    const label = new Map(question.tags.map((t) => [t.id, t.label]));
    const events: NewMatchEvent[] = helpers.map((h, i) => ({
      questionId: question.id,
      helperId: h.userId,
      wave,
      rank: i + 1,
      score: h.score,
      regime,
      reasons: h.reasons.map((r) => displayReason(r, label)),
    }));
    if (events.length > 0) {
      await this.store.recordWave(events, (tx) =>
        this.notifier.notify(
          events.map((e) => ({
            userId: e.helperId,
            type: 'match.request' as const,
            payload: { questionId: question.id, title: question.title, wave, reasons: e.reasons },
          })),
          tx,
        ),
      );
    }
    return {
      kind: helpers.length < MATCHING.helpersPerWave ? 'open_to_stack' : 'matched',
      helpers,
      regime,
    };
  }
}

/** Les raisons portent les libellés des étiquettes, pour un affichage direct (« docker, nginx »). */
function displayReason(
  reason: MatchReason,
  label: Map<string, string>,
): { code: string; params: Record<string, unknown> } {
  const { tagIds, tagId, ...rest } = reason.params as {
    tagIds?: string[];
    tagId?: string;
  } & Record<string, unknown>;
  return {
    code: reason.code,
    params: {
      ...rest,
      ...(tagIds ? { tags: tagIds.map((t) => label.get(t) ?? t) } : {}),
      ...(tagId ? { tag: label.get(tagId) ?? tagId } : {}),
    },
  };
}

export class NotSolicitedError extends Error {}

export interface ClaimStore {
  /** Marque la sollicitation la plus récente de l'aidant ; false s'il n'a pas été sollicité. */
  claim(
    questionId: string,
    helperId: string,
    at: Date,
    tx?: unknown,
  ): Promise<{ claimedAt: Date } | null>;
}

/** S11 : « Je m'en occupe » : un aidant sollicité le signale ; l'escalade attend 20 minutes. */
export class ClaimQuestion {
  constructor(
    private readonly store: ClaimStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(questionId: string, helperId: string, tx?: unknown): Promise<{ claimedAt: Date }> {
    const result = await this.store.claim(questionId, helperId, this.now(), tx);
    if (!result) throw new NotSolicitedError();
    return result;
  }
}
