import { z } from 'zod';
import { PageInfo } from './xp';

// SOS Dev (docs/architecture/06-api.md#sos-dev-sos-matching). S1 : poser, S2 : piste IA,
// S3 : aidants sollicités, S4 : réponses.

export const Urgency = z.enum(['low', 'normal', 'high']);
export const Lang = z.enum(['fr', 'en']);
export const QuestionStatus = z.enum(['open', 'resolved', 'closed']);
export const AiStatus = z.enum(['pending', 'done', 'failed', 'skipped']);

export const QUESTION_LIMITS = {
  titleMin: 10,
  titleMax: 150,
  bodyMax: 10_000,
  codeMax: 10_000,
  tagsMin: 1,
  tagsMax: 5,
  /** Questions par utilisateur et par heure (anti-spam, 06-api § Limitation du débit). */
  perHour: 10,
} as const;

/**
 * S14 : sites de reproduction acceptés (10-securite.md). Le domaine lui-même ou l'un de ses
 * sous-domaines (ex. `abc.stackblitz.io`), en HTTPS seulement.
 */
export const REPRO_HOSTS = [
  'stackblitz.com',
  'stackblitz.io',
  'codesandbox.io',
  'csb.app',
  'replit.com',
  'gist.github.com',
  'github.com',
  'codepen.io',
  'jsfiddle.net',
] as const;

export const REPRO_URL_MAX = 500;

/**
 * Vrai si `value` est un lien HTTPS vers un site de reproduction accepté. L'hôte doit être suivi
 * de `/`, `?`, `#` ou de la fin : ni identifiants (`user@`), ni port, ni espace.
 */
export function isReproUrl(value: string): boolean {
  const m = /^https:\/\/([A-Za-z0-9.-]+)(?:[/?#]\S*)?$/.exec(value);
  if (!m) return false;
  const host = m[1]!.toLowerCase();
  if (host.startsWith('.') || host.includes('..')) return false;
  return REPRO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Lien de reproduction (S14) : vide = absent. */
export const ReproUrl = z
  .string()
  .trim()
  .max(REPRO_URL_MAX)
  .transform((v) => v || null)
  .refine((v) => v === null || isReproUrl(v), {
    message: `HTTPS link to one of: ${REPRO_HOSTS.join(', ')}`,
  });

/** POST /api/v1/questions (S1). `clientId` est généré par le client, hors ligne compris (O2). */
export const AskQuestionRequest = z.object({
  clientId: z.uuid(),
  title: z.string().trim().min(QUESTION_LIMITS.titleMin).max(QUESTION_LIMITS.titleMax),
  body: z.string().trim().min(1).max(QUESTION_LIMITS.bodyMax),
  codeSnippet: z.string().max(QUESTION_LIMITS.codeMax).nullish(),
  tagSlugs: z
    .array(z.string().trim().toLowerCase().min(1).max(40))
    .min(QUESTION_LIMITS.tagsMin)
    .max(QUESTION_LIMITS.tagsMax),
  urgency: Urgency.default('normal'),
  lang: Lang,
  /** S14 : lien de reproduction facultatif (liste blanche de domaines). */
  reproUrl: ReproUrl.nullish(),
});
export type AskQuestionRequest = z.infer<typeof AskQuestionRequest>;

export const PublicAuthor = z.object({
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  /** Compte de démonstration, toujours signalé comme tel (§6.6). */
  isDemo: z.boolean(),
});
export type PublicAuthor = z.infer<typeof PublicAuthor>;

export const QuestionTag = z.object({ slug: z.string(), label: z.string() });

export const AskQuestionResponse = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  status: QuestionStatus,
  aiStatus: AiStatus,
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  /** Nombre de secrets masqués avant stockage (« Nous avons masqué 1 secret »). */
  secretsMasked: z.number().int(),
  author: PublicAuthor,
});
export type AskQuestionResponse = z.infer<typeof AskQuestionResponse>;

export const QuestionSummary = z.object({
  id: z.uuid(),
  title: z.string(),
  status: QuestionStatus,
  urgency: Urgency,
  lang: Lang,
  tags: z.array(QuestionTag),
  answerCount: z.number().int(),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().nullable(),
  author: PublicAuthor,
});
export type QuestionSummary = z.infer<typeof QuestionSummary>;

const booleanFlag = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

/** GET /api/v1/questions (S6, S16) : filtres combinables, recherche plein texte, curseur. */
export const ListQuestionsQuery = z.object({
  status: QuestionStatus.optional(),
  tag: z.string().trim().toLowerCase().max(40).optional(),
  q: z.string().trim().min(2).max(200).optional(),
  /** Mes questions (connecté). */
  mine: booleanFlag,
  /** Sans réponse (file « Personne n'a encore répondu », S16). */
  unanswered: booleanFlag,
  /** Mes stacks (connecté) : étiquettes de mes compétences et de « Je peux aider sur » (S16). */
  forMe: booleanFlag,
  /**
   * Ordre : `recent` (le plus récent d'abord) ou `waiting` (S16 : la plus urgente, puis celle qui
   * attend depuis le plus longtemps). Ignoré avec `q`, triée par pertinence (S6).
   */
  sort: z.enum(['recent', 'waiting']).default('recent'),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListQuestionsQuery = z.infer<typeof ListQuestionsQuery>;

export const ListQuestionsResponse = z.object({
  data: z.array(QuestionSummary),
  page: PageInfo,
});
export type ListQuestionsResponse = z.infer<typeof ListQuestionsResponse>;

export const AnswerView = z.object({
  id: z.uuid(),
  body: z.string(),
  isAccepted: z.boolean(),
  helpfulCount: z.number().int(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  author: PublicAuthor,
});
export type AnswerView = z.infer<typeof AnswerView>;

/** Raison affichée d'un aidant sollicité (S3) : jamais un pourcentage sans méthode. */
export const MatchReason = z.object({
  code: z.string(),
  params: z.record(z.string(), z.unknown()),
});

export const MatchedHelper = z.object({
  helper: PublicAuthor,
  wave: z.number().int(),
  rank: z.number().int(),
  reasons: z.array(MatchReason),
  notifiedAt: z.iso.datetime(),
  claimedAt: z.iso.datetime().nullable(),
});
export type MatchedHelper = z.infer<typeof MatchedHelper>;

/** POST /api/v1/questions/:id/claim : « Je m'en occupe » (S11). */
export const ClaimResponse = z.object({ questionId: z.uuid(), claimedAt: z.iso.datetime() });
export type ClaimResponse = z.infer<typeof ClaimResponse>;

/** GET /api/v1/questions/:id : question, piste IA, réponses, aidants sollicités. */
export const QuestionDetail = QuestionSummary.extend({
  body: z.string(),
  codeSnippet: z.string().nullable(),
  /** S14 : lien de reproduction, déjà validé à l'écriture. */
  reproUrl: z.string().nullable(),
  version: z.number().int(),
  /** Piste IA, présente seulement si aiStatus = done ; à afficher avec « Généré par IA, à vérifier ». */
  aiHint: z.string().nullable(),
  aiStatus: AiStatus,
  acceptedAnswerId: z.uuid().nullable(),
  answers: z.array(AnswerView),
  helpers: z.array(MatchedHelper),
});
export type QuestionDetail = z.infer<typeof QuestionDetail>;

/** PATCH /api/v1/questions/:id (O4) : champs modifiés + version connue du client. */
export const UpdateQuestionRequest = z
  .object({
    title: z.string().trim().min(QUESTION_LIMITS.titleMin).max(QUESTION_LIMITS.titleMax).optional(),
    body: z.string().trim().min(1).max(QUESTION_LIMITS.bodyMax).optional(),
    codeSnippet: z.string().max(QUESTION_LIMITS.codeMax).nullish(),
    baseVersion: z.number().int().min(1),
  })
  .refine((v) => v.title !== undefined || v.body !== undefined || v.codeSnippet !== undefined, {
    message: 'Au moins un champ à modifier',
  });
export type UpdateQuestionRequest = z.infer<typeof UpdateQuestionRequest>;

export const UpdateQuestionResponse = z.object({
  id: z.uuid(),
  version: z.number().int(),
  title: z.string(),
  body: z.string(),
  codeSnippet: z.string().nullable(),
  secretsMasked: z.number().int(),
});
export type UpdateQuestionResponse = z.infer<typeof UpdateQuestionResponse>;

/** GET /api/v1/tags : référentiel des étiquettes (sélecteurs du front, détection S9). */
export const ListTagsResponse = z.object({
  data: z.array(QuestionTag.extend({ aliases: z.array(z.string()) })),
});
export type ListTagsResponse = z.infer<typeof ListTagsResponse>;
