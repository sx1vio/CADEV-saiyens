import { z } from 'zod';

export const XpEventKind = z.enum([
  'answer_accepted',
  'answer_fast_bonus',
  'answer_helpful_vote',
  'task_completed',
  'code_review_given',
  'project_demo_shared',
  'question_resolved',
  'deployment_verified',
  'field_test_confirmed',
  // P2 (X6, R13, S15) : prévus dans la base, pas encore attribués.
  'difficulty_bonus',
  'mentoring',
  'still_resolved',
  'revert',
]);

/** Pagination par curseur (docs/architecture/06-api.md#pagination). */
export const PageInfo = z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() });

/** GET /api/v1/u/:handle/proofs : journal public des Proof XP (X1, PR3). Chaque point renvoie à sa source. */
export const ProofsResponse = z.object({
  user: z.object({ handle: z.string(), displayName: z.string() }),
  /** Somme du journal, annulations comprises. */
  totalXp: z.number().int(),
  events: z.array(
    z.object({
      id: z.uuid(),
      kind: XpEventKind,
      points: z.number().int(),
      tag: z.object({ slug: z.string(), label: z.string() }).nullable(),
      source: z.object({ type: z.string(), id: z.uuid() }),
      createdAt: z.iso.datetime(),
      /** Renseigné si l'événement a été annulé par la modération. */
      revertedAt: z.iso.datetime().nullable(),
      /** Pour un événement d'annulation : l'événement annulé. */
      revertsId: z.uuid().nullable(),
    }),
  ),
  page: PageInfo,
});
export type ProofsResponse = z.infer<typeof ProofsResponse>;

export const ProofsQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ProofsQuery = z.infer<typeof ProofsQuery>;

/** GET /api/v1/rules/xp : barème et formules publiés (X5, page /regles). */
export const XpRulesResponse = z.object({
  points: z.record(z.string(), z.number().int()),
  limits: z.object({
    dailyCap: z.number().int(),
    uncappedKinds: z.array(z.string()),
    fastBonusMinutes: z.number().int(),
    helpfulVotesPerAnswer: z.number().int(),
    validationsPerPairPerWeek: z.number().int(),
    minVoterAccountAgeHours: z.number().int(),
  }),
  scoring: z.object({
    githubPerRepo: z.number().int(),
    githubCap: z.number().int(),
    platformCap: z.number().int(),
    activeMonths: z.number().int(),
    minLanguageShare: z.number(),
  }),
});
export type XpRulesResponse = z.infer<typeof XpRulesResponse>;
