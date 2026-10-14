import { z } from 'zod';

// Catalogue des jobs pg-boss : nom, payload validé et options d'envoi.
// Référence : docs/architecture/07-taches-fond-temps-reel.md
export const JOBS = {
  /** PR1 et X3 : import des dépôts et langages GitHub, calcul du signal G des compétences. */
  githubImportProfile: {
    name: 'github.import-profile',
    payload: z.object({ userId: z.uuid() }),
    options: { retryLimit: 3, retryDelay: 30, retryBackoff: true, expireInSeconds: 120 },
  },
  /** S2 : piste IA d'une question. Envoyé par S1 après la création ; 10 s puis ai_status = failed. */
  aiHint: {
    name: 'ai.hint',
    payload: z.object({ questionId: z.uuid() }),
    options: { retryLimit: 1, retryDelay: 5, expireInSeconds: 30 },
  },
  /** S3 : première vague du matching, envoyée par S1 après la création de la question. */
  matchingRun: {
    name: 'matching.run',
    payload: z.object({ questionId: z.uuid() }),
    options: { retryLimit: 3, retryDelay: 5, retryBackoff: true, expireInSeconds: 30 },
  },
  /** §6.1 : vague 2, 15 minutes après la première, si personne n'a répondu ni ne s'en occupe. */
  matchingEscalate: {
    name: 'matching.escalate',
    payload: z.object({ questionId: z.uuid() }),
    options: { retryLimit: 3, retryDelay: 30, retryBackoff: true, expireInSeconds: 30 },
  },
} as const;

export type JobName = (typeof JOBS)[keyof typeof JOBS]['name'];
export type JobDefinition = (typeof JOBS)[keyof typeof JOBS];
export type JobPayload<J extends JobDefinition> = z.infer<J['payload']>;
