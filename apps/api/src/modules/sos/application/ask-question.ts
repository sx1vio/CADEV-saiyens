import { QUESTION_LIMITS } from '@devhub/contracts';
import {
  type QuestionDraft,
  TooManyQuestionsError,
  UnknownTagsError,
  maskDraft,
  retryAfterSeconds,
} from '../domain/question';
import type { QuestionWriter, StoredQuestion } from '../domain/ports';

export interface AskQuestionInput extends QuestionDraft {
  authorId: string;
  clientId: string;
  tagSlugs: string[];
  urgency: 'low' | 'normal' | 'high';
  lang: 'fr' | 'en';
}

export interface AskQuestionOutput {
  question: StoredQuestion;
  secretsMasked: number;
  /** false si la question existait déjà avec ce clientId (deuxième filet de l'idempotence). */
  created: boolean;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * S1 : poser une question. Publiée immédiatement ; la piste IA (S2) et le matching (S3)
 * suivent en tâche de fond, sans jamais bloquer la publication.
 */
export class AskQuestion {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async execute(writer: QuestionWriter, input: AskQuestionInput): Promise<AskQuestionOutput> {
    await writer.lockAuthor(input.authorId);
    // Même clientId déjà publié (renvoi après une coupure réseau, autre clé) : pas de doublon.
    const existing = await writer.findByClientId(input.authorId, input.clientId);
    if (existing) return { question: existing, secretsMasked: 0, created: false };

    const now = this.now();
    const recent = await writer.createdSince(input.authorId, new Date(now.getTime() - HOUR_MS));
    const wait = retryAfterSeconds(recent, QUESTION_LIMITS.perHour, now);
    if (wait > 0) throw new TooManyQuestionsError(wait);

    const slugs = [...new Set(input.tagSlugs)];
    const tags = await writer.tagIdsBySlug(slugs);
    const unknown = slugs.filter((s) => !tags.has(s));
    if (unknown.length > 0) throw new UnknownTagsError(unknown);

    const { draft, secretsMasked } = maskDraft(input);
    const question = await writer.create({
      authorId: input.authorId,
      clientId: input.clientId,
      ...draft,
      reproUrl: draft.reproUrl ?? null,
      urgency: input.urgency,
      lang: input.lang,
      tagIds: slugs.map((s) => tags.get(s)!),
    });
    return { question, secretsMasked, created: true };
  }
}
