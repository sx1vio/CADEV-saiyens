import { z } from 'zod';
import { QuestionTag } from './questions';
import { RoomRole, RoomState } from './rooms';
import { MySkillsResponse } from './skills';

// Developer Passport public (CDC v3 §6.4 : PR2, PR3, PR7, PR10, PR11, PR14).

export const Availability = z.object({
  now: z.boolean().optional(),
  until: z.iso.datetime().optional(),
  /** Créneaux dans le fuseau du dev : day 0 = dimanche, « HH:MM ». */
  slots: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        from: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        to: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      }),
    )
    .max(14)
    .optional(),
});
export type Availability = z.infer<typeof Availability>;

/** PR14 réduit (ADR-0017) : mode non listé, pays et disponibilités masquables. */
export const Privacy = z.object({
  unlisted: z.boolean().optional(),
  hideCountry: z.boolean().optional(),
  hideTimezone: z.boolean().optional(),
  hideAvailability: z.boolean().optional(),
  hideStats: z.boolean().optional(),
});
export type Privacy = z.infer<typeof Privacy>;

/** PATCH /api/v1/me (PR1, PR10, PR14, T3) : seuls les champs fournis changent. */
export const UpdateMeRequest = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    bio: z.string().trim().max(500).nullable(),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .nullable(),
    /** Identifiant IANA, ex. « Africa/Abidjan ». */
    timezone: z.string().max(64).nullable(),
    languages: z
      .array(z.enum(['fr', 'en']))
      .min(1)
      .max(2),
    uiLang: z.enum(['fr', 'en']),
    lookingFor: z.string().trim().max(200).nullable(),
    availability: Availability,
    canHelpTagSlugs: z.array(z.string().trim().toLowerCase()).max(5),
    wantLearnTagSlugs: z.array(z.string().trim().toLowerCase()).max(5),
    doNotDisturb: z.boolean(),
    privacy: Privacy,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Au moins un champ à modifier' });
export type UpdateMeRequest = z.infer<typeof UpdateMeRequest>;

/** GET /api/v1/u/:handle (PR2) : public sans compte. Chaque chiffre est calculé, jamais saisi. */
export const PassportResponse = z.object({
  user: z.object({
    handle: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    bio: z.string().nullable(),
    /** null si masqué (PR14). */
    country: z.string().nullable(),
    timezone: z.string().nullable(),
    languages: z.array(z.enum(['fr', 'en'])),
    lookingFor: z.string().nullable(),
    availability: Availability.nullable(),
    isDemo: z.boolean(),
    memberSince: z.iso.datetime(),
  }),
  trust: z.object({
    githubLinked: z.boolean(),
    githubAccountYears: z.number().int().nullable(),
    emailVerified: z.boolean(),
    demo: z.boolean(),
    founder: z.boolean(),
  }),
  /** PR3, PR7 : décomposition G + P de chaque score. */
  skills: MySkillsResponse.shape.skills,
  canHelp: z.array(QuestionTag),
  wantLearn: z.array(QuestionTag),
  /** null si le dev masque ses statistiques (PR14). */
  stats: z
    .object({
      totalXp: z.number().int(),
      answersAccepted: z.number().int(),
      helpfulVotes: z.number().int(),
      questionsResolved: z.number().int(),
      /** Médiane, en minutes, entre une question et la réponse du dev qui a été validée. */
      medianMinutesToHelp: z.number().nullable(),
      contributions: z.number().int(),
      contributionsVerified: z.number().int(),
      reviews: z.number().int(),
    })
    .nullable(),
  projects: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      state: RoomState,
      role: RoomRole,
      repoFullName: z.string().nullable(),
    }),
  ),
});
export type PassportResponse = z.infer<typeof PassportResponse>;
