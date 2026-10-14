import { z } from 'zod';
import { AnswerView, QuestionStatus } from './questions';

// S4 : répondre, voter, valider (docs/architecture/06-api.md#sos-dev-sos-matching).

export const ANSWER_LIMITS = { bodyMax: 10_000 } as const;

/** POST /api/v1/questions/:id/answers. `clientId` généré par le client (hors ligne, O2). */
export const PostAnswerRequest = z.object({
  clientId: z.uuid(),
  body: z.string().trim().min(1).max(ANSWER_LIMITS.bodyMax),
});
export type PostAnswerRequest = z.infer<typeof PostAnswerRequest>;

export const PostAnswerResponse = AnswerView.extend({
  clientId: z.uuid(),
  questionId: z.uuid(),
  secretsMasked: z.number().int(),
});
export type PostAnswerResponse = z.infer<typeof PostAnswerResponse>;

/** Ce qui a été attribué ou retenu, et pourquoi (X2) : affiché tel quel à l'utilisateur. */
export const XpOutcome = z.object({
  granted: z.array(z.object({ handle: z.string(), kind: z.string(), points: z.number().int() })),
  withheld: z.array(z.object({ handle: z.string(), kind: z.string(), reason: z.string() })),
});
export type XpOutcome = z.infer<typeof XpOutcome>;

/** POST /api/v1/answers/:id/vote : « Réponse utile ». Voter deux fois ne change rien. */
export const VoteResponse = z.object({
  answerId: z.uuid(),
  helpfulCount: z.number().int(),
  /** false si le vote existait déjà. */
  counted: z.boolean(),
  xp: XpOutcome,
});
export type VoteResponse = z.infer<typeof VoteResponse>;

/** POST /api/v1/answers/:id/accept : l'auteur valide la réponse qui l'a débloqué. */
export const AcceptAnswerResponse = z.object({
  questionId: z.uuid(),
  answerId: z.uuid(),
  status: QuestionStatus,
  resolvedAt: z.iso.datetime(),
  xp: XpOutcome,
});
export type AcceptAnswerResponse = z.infer<typeof AcceptAnswerResponse>;

/** PATCH /api/v1/answers/:id (O4). */
export const UpdateAnswerRequest = z.object({
  body: z.string().trim().min(1).max(ANSWER_LIMITS.bodyMax),
  baseVersion: z.number().int().min(1),
});
export type UpdateAnswerRequest = z.infer<typeof UpdateAnswerRequest>;

export const UpdateAnswerResponse = z.object({
  id: z.uuid(),
  version: z.number().int(),
  body: z.string(),
  secretsMasked: z.number().int(),
});
export type UpdateAnswerResponse = z.infer<typeof UpdateAnswerResponse>;
