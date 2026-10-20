import { z } from 'zod';
import { PublicAuthor, QuestionTag } from './questions';
import { PageInfo } from './xp';

// Demandes de retour et de revue de code (R6). La demande est visible dans le flux de la
// stack de la salle ; un autre dev la prend, le demandeur confirme (+8 XP pour une revue).

export const FeedbackKind = z.enum(['feedback', 'code_review']);
export type FeedbackKind = z.infer<typeof FeedbackKind>;

export const FeedbackStatus = z.enum(['open', 'in_progress', 'done', 'cancelled']);
export type FeedbackStatus = z.infer<typeof FeedbackStatus>;

/** Lien à relire : PR, commit ou comparaison GitHub, ou toute page https (démo, maquette). */
export const FeedbackUrl = z.url({ protocol: /^https$/ }).max(500);

/** POST /api/v1/rooms/:id/feedback-requests (R6), réservé aux membres de la salle. */
export const CreateFeedbackRequest = z.object({
  kind: FeedbackKind,
  url: FeedbackUrl.nullish(),
  note: z.string().trim().max(1_000).nullish(),
});
export type CreateFeedbackRequest = z.infer<typeof CreateFeedbackRequest>;

export const FeedbackRequestView = z.object({
  id: z.uuid(),
  kind: FeedbackKind,
  status: FeedbackStatus,
  url: z.string().nullable(),
  note: z.string().nullable(),
  room: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
  stack: z.array(QuestionTag),
  requester: PublicAuthor,
  reviewer: PublicAuthor.nullable(),
  createdAt: z.iso.datetime(),
  confirmedAt: z.iso.datetime().nullable(),
});
export type FeedbackRequestView = z.infer<typeof FeedbackRequestView>;

/** GET /api/v1/feedback-requests : flux de la stack, demandes ouvertes des salles publiques. */
export const ListFeedbackRequestsQuery = z.object({
  /** Étiquettes séparées par des virgules : une demande correspond si sa salle en a au moins une. */
  tags: z
    .string()
    .max(500)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListFeedbackRequestsQuery = z.infer<typeof ListFeedbackRequestsQuery>;

export const ListFeedbackRequestsResponse = z.object({
  data: z.array(FeedbackRequestView),
  page: PageInfo,
});
export type ListFeedbackRequestsResponse = z.infer<typeof ListFeedbackRequestsResponse>;

/** POST /api/v1/feedback-requests/:id/confirm : points versés au relecteur (0 si retenus). */
export const ConfirmFeedbackResponse = z.object({
  request: FeedbackRequestView,
  points: z.number().int(),
  withheld: z.array(z.object({ kind: z.string(), reason: z.string() })),
});
export type ConfirmFeedbackResponse = z.infer<typeof ConfirmFeedbackResponse>;
