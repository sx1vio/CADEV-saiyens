import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// À déplacer dans @devhub/contracts (#5).
export const MySkillsResponse = z.object({
  skills: z.array(
    z.object({
      tag: z.object({ slug: z.string(), label: z.string() }),
      /** min(100, G + P) */
      score: z.number().int(),
      level: z.enum(['beginner', 'confirmed', 'advanced', 'expert']),
      /** G : part GitHub (0 à 40). */
      githubSignal: z.number().int(),
      /** Dépôts qualifiés au sens de X3. */
      githubRepos: z.number().int(),
      /** P : part plateforme, Proof XP plafonnés à 60. */
      platformPoints: z.number().int(),
    }),
  ),
  /** Date du dernier import GitHub ; null si l'import n'a pas encore eu lieu (en cours après l'inscription). */
  lastImportedAt: z.iso.datetime().nullable(),
});
export type MySkillsResponse = z.infer<typeof MySkillsResponse>;
export class MySkillsResponseDto extends createZodDto(MySkillsResponse) {}
