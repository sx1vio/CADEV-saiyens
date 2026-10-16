import { z } from 'zod';

/** GET /api/v1/me (A1, PR11, M3). */
export const MeResponse = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  bio: z.string().nullable(),
  country: z.string().nullable(),
  timezone: z.string().nullable(),
  languages: z.array(z.enum(['fr', 'en'])),
  uiLang: z.enum(['fr', 'en']),
  /** Y3 : récapitulatif par e-mail des notifications non lues. */
  emailNotifications: z.boolean(),
  lookingFor: z.string().nullable(),
  githubLinked: z.boolean(),
  githubCreatedAt: z.iso.datetime().nullable(),
  codeOfConductAcceptedAt: z.iso.datetime().nullable(),
  isAdmin: z.boolean(),
  isDemo: z.boolean(),
  createdAt: z.iso.datetime(),
  /** PR11 : signaux de confiance, dérivés de données vérifiables. */
  trust: z.object({
    githubLinked: z.boolean(),
    githubAccountYears: z.number().int().nonnegative().nullable(),
    emailVerified: z.boolean(),
    demo: z.boolean(),
    founder: z.boolean(),
  }),
});
export type MeResponse = z.infer<typeof MeResponse>;

/** POST /api/v1/me/code-of-conduct (M3). */
export const CodeOfConductResponse = z.object({ codeOfConductAcceptedAt: z.iso.datetime() });
export type CodeOfConductResponse = z.infer<typeof CodeOfConductResponse>;

/** DELETE /api/v1/me (A3) : la personne retape son handle pour confirmer. */
export const DeleteMeRequest = z.object({ confirmHandle: z.string().trim().min(1).max(40) });
export type DeleteMeRequest = z.infer<typeof DeleteMeRequest>;
