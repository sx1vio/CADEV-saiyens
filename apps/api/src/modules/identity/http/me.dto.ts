import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Réponse de GET /api/v1/me. À déplacer dans @devhub/contracts dès que le paquet existe (#5).
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
export class MeResponseDto extends createZodDto(MeResponse) {}

export const CodeOfConductResponse = z.object({ codeOfConductAcceptedAt: z.iso.datetime() });
export type CodeOfConductResponse = z.infer<typeof CodeOfConductResponse>;
export class CodeOfConductResponseDto extends createZodDto(CodeOfConductResponse) {}
