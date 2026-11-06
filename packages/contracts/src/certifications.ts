import { z } from 'zod';
import { PublicAuthor } from './questions';

// Certifications DevHub : le serveur tire les questions, chronomètre et corrige. Les réponses ne
// sont envoyées qu'avec la correction. Le catalogue public (programme, durée, seuil) est dans
// @devhub/core (CERT_CATALOG).

export const CertAttemptMode = z.enum(['exam', 'mock']);
export type CertAttemptMode = z.infer<typeof CertAttemptMode>;

/** Question telle qu'affichée : sans la bonne réponse. */
export const CertQuestion = z.object({
  id: z.string(),
  q: z.string(),
  code: z.string().nullable(),
  choices: z.array(z.string()),
  topic: z.number().int(),
});
export type CertQuestion = z.infer<typeof CertQuestion>;

/** POST /api/v1/certifications/:certId/attempts */
export const StartCertAttemptRequest = z.object({ mode: CertAttemptMode.default('exam') });
export type StartCertAttemptRequest = z.infer<typeof StartCertAttemptRequest>;

export const CertAttemptView = z.object({
  id: z.uuid(),
  certId: z.string(),
  mode: CertAttemptMode,
  deadline: z.iso.datetime(),
  /** Une tentative en cours est reprise (rechargement de la page) plutôt que recommencée. */
  resumed: z.boolean(),
  questions: z.array(CertQuestion),
});
export type CertAttemptView = z.infer<typeof CertAttemptView>;

/** POST /api/v1/certifications/attempts/:id/submit : index des choix affichés, null = sans réponse. */
export const SubmitCertAttemptRequest = z.object({
  answers: z.array(z.number().int().min(0).max(9).nullable()).max(60),
});
export type SubmitCertAttemptRequest = z.infer<typeof SubmitCertAttemptRequest>;

export const CertCorrection = CertQuestion.extend({
  /** Index du choix affiché donné par le candidat. */
  given: z.number().int().nullable(),
  /** Index du bon choix dans l'ordre affiché. */
  answer: z.number().int(),
  explain: z.string(),
  correct: z.boolean(),
});
export type CertCorrection = z.infer<typeof CertCorrection>;

export const CertAttemptResult = z.object({
  attemptId: z.uuid(),
  certId: z.string(),
  mode: CertAttemptMode,
  score: z.number().int(),
  good: z.number().int(),
  total: z.number().int(),
  passed: z.boolean(),
  /** Envoyée après la fin du temps (plus la marge) : les réponses ne sont pas prises en compte. */
  late: z.boolean(),
  topics: z.array(
    z.object({ topic: z.number().int(), ok: z.number().int(), total: z.number().int() }),
  ),
  corrections: z.array(CertCorrection),
  /** Certificat obtenu ou amélioré par cette tentative (mode exam seulement). */
  certificate: z
    .object({ code: z.string(), bestScore: z.number().int(), passedAt: z.iso.datetime() })
    .nullable(),
  nextAttemptAt: z.iso.datetime().nullable(),
});
export type CertAttemptResult = z.infer<typeof CertAttemptResult>;

/** GET /api/v1/certifications/me */
export const MyCertificationsResponse = z.object({
  items: z.array(
    z.object({
      certId: z.string(),
      certificate: z
        .object({ code: z.string(), bestScore: z.number().int(), passedAt: z.iso.datetime() })
        .nullable(),
      lastAttempt: z
        .object({ score: z.number().int(), passed: z.boolean(), at: z.iso.datetime() })
        .nullable(),
      /** Prochaine tentative d'examen possible, si un échec récent impose d'attendre. */
      nextAttemptAt: z.iso.datetime().nullable(),
      /** Tentative en cours (examen ou examen blanc), à reprendre. */
      active: z.object({ mode: CertAttemptMode, deadline: z.iso.datetime() }).nullable(),
    }),
  ),
});
export type MyCertificationsResponse = z.infer<typeof MyCertificationsResponse>;

/** GET /api/v1/certifications/:certId/practice?topic=&ids=&count= : entraînement sans chrono. */
export const CertPracticeQuery = z.object({
  topic: z.coerce.number().int().min(0).max(20).optional(),
  /** Identifiants séparés par des virgules (révision des erreurs). */
  ids: z
    .string()
    .max(30 * 17)
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean).slice(0, 30) : undefined)),
  count: z.coerce.number().int().min(1).max(30).default(10),
});
export type CertPracticeQuery = z.infer<typeof CertPracticeQuery>;

export const CertPracticeResponse = z.object({ questions: z.array(CertQuestion) });
export type CertPracticeResponse = z.infer<typeof CertPracticeResponse>;

/** POST /api/v1/certifications/:certId/check : correction immédiate d'une question d'entraînement. */
export const CertCheckRequest = z.object({
  id: z.string().min(1).max(32),
  choice: z.number().int().min(0).max(9),
});
export type CertCheckRequest = z.infer<typeof CertCheckRequest>;

export const CertCheckResponse = z.object({
  correct: z.boolean(),
  answer: z.number().int(),
  explain: z.string(),
});
export type CertCheckResponse = z.infer<typeof CertCheckResponse>;

export const CertificateView = z.object({
  certId: z.string(),
  code: z.string(),
  bestScore: z.number().int(),
  passedAt: z.iso.datetime(),
});
export type CertificateView = z.infer<typeof CertificateView>;

/** GET /api/v1/u/:handle/certificates : badges publics du profil. */
export const UserCertificatesResponse = z.object({ items: z.array(CertificateView) });
export type UserCertificatesResponse = z.infer<typeof UserCertificatesResponse>;

/** GET /api/v1/certifications/verify/:code : vérification publique d'un certificat. */
export const VerifyCertificateResponse = CertificateView.extend({ holder: PublicAuthor });
export type VerifyCertificateResponse = z.infer<typeof VerifyCertificateResponse>;
