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
  /** R9 : GitHub indisponible à la clôture : nouvel essai de la vérification de la PR. */
  githubVerifyPr: {
    name: 'github.verify-pr',
    payload: z.object({ taskId: z.uuid(), actorId: z.uuid() }),
    options: { retryLimit: 5, retryDelay: 60, retryBackoff: true, expireInSeconds: 60 },
  },
  /** Actualités : flux RSS, YouTube, Hacker News, DEV. Cron toutes les 15 min, et au démarrage du worker. */
  newsIngest: {
    name: 'news.ingest',
    payload: z.object({}),
    options: { retryLimit: 0, expireInSeconds: 300 },
    queue: { policy: 'exclusive' },
    cron: '*/15 * * * *',
  },
  /** Actualités GitHub (dépôts, versions) : une fois par heure, limite de 60 requêtes/heure sans jeton. */
  newsIngestGithub: {
    name: 'news.ingest-github',
    payload: z.object({}),
    options: { retryLimit: 0, expireInSeconds: 120 },
    queue: { policy: 'exclusive' },
    cron: '5 * * * *',
  },
} as const;

export type JobName = (typeof JOBS)[keyof typeof JOBS]['name'];
export type JobDefinition = (typeof JOBS)[keyof typeof JOBS];
export type JobPayload<J extends JobDefinition> = z.infer<J['payload']>;
