import { z } from 'zod';
import { PublicAuthor } from './questions';
import { PageInfo } from './xp';

// Tâches et discussion des salles (R2, R4, R8, R9).

export const TaskLevel = z.enum(['first_step', 'easy', 'medium', 'hard']);
export const TaskStatus = z.enum(['open', 'taken', 'in_review', 'done']);
export const TaskVerification = z.enum(['github_verified', 'declared']);

/** Lien de PR GitHub : https://github.com/owner/repo/pull/123 */
export const PullRequestUrl = z
  .string()
  .trim()
  .regex(/^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}\/pull\/\d{1,9}\/?$/);

/** POST /api/v1/rooms/:id/tasks (R2), réservé aux membres. */
export const CreateTaskRequest = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(5_000).nullish(),
  level: TaskLevel.default('medium'),
});
export type CreateTaskRequest = z.infer<typeof CreateTaskRequest>;

export const TaskView = z.object({
  id: z.uuid(),
  roomId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  level: TaskLevel,
  status: TaskStatus,
  assignee: PublicAuthor.nullable(),
  prUrl: z.string().nullable(),
  /** Renseigné à la clôture : « Vérifié par GitHub » ou « déclarée par le créateur » (R9). */
  verification: TaskVerification.nullable(),
  /** Tâche importée depuis une issue GitHub (R2). */
  fromGithubIssue: z.boolean(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  takenAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
});
export type TaskView = z.infer<typeof TaskView>;

export const ListTasksResponse = z.object({ data: z.array(TaskView) });
export type ListTasksResponse = z.infer<typeof ListTasksResponse>;

export const ImportIssuesResponse = z.object({
  imported: z.number().int(),
  skipped: z.number().int(),
  data: z.array(TaskView),
});
export type ImportIssuesResponse = z.infer<typeof ImportIssuesResponse>;

/** POST /api/v1/tasks/:id/submit (R2) : l'assigné passe la tâche en revue avec sa PR. */
export const SubmitTaskRequest = z.object({ prUrl: PullRequestUrl });
export type SubmitTaskRequest = z.infer<typeof SubmitTaskRequest>;

/** POST /api/v1/tasks/:id/complete (R8) : le créateur clôt la tâche, lien de PR facultatif. */
export const CompleteTaskRequest = z.object({ prUrl: PullRequestUrl.nullish() });
export type CompleteTaskRequest = z.infer<typeof CompleteTaskRequest>;

export const CompleteTaskResponse = z.object({
  task: TaskView,
  /** Points attribués au contributeur (+15), 0 s'ils ont été retenus. */
  points: z.number().int(),
  withheld: z.array(z.object({ kind: z.string(), reason: z.string() })),
});
export type CompleteTaskResponse = z.infer<typeof CompleteTaskResponse>;

/** POST /api/v1/rooms/:id/tasks/suggest (R5), membres : langue des tâches proposées. */
export const SuggestTasksRequest = z.object({ lang: z.enum(['fr', 'en']).default('fr') });
export type SuggestTasksRequest = z.infer<typeof SuggestTasksRequest>;

/** Tâche proposée par l'IA : rien n'est créé tant qu'un membre ne la valide pas (POST /tasks). */
export const SuggestedTask = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(1_000).nullable(),
  level: TaskLevel,
});
export type SuggestedTask = z.infer<typeof SuggestedTask>;

export const SuggestTasksStatus = z.enum([
  'done', // tâches proposées par le modèle
  'cached', // même discussion déjà analysée
  'empty', // aucun message à analyser
  'quota', // quota horaire d'IA atteint
  'disabled', // IA non configurée
  'failed', // délai dépassé, refus ou réponse invalide
]);

export const SuggestTasksResponse = z.object({
  status: SuggestTasksStatus,
  data: z.array(SuggestedTask).max(5),
});
export type SuggestTasksResponse = z.infer<typeof SuggestTasksResponse>;

export const MessageKind = z.enum(['text', 'standup']);

/** POST /api/v1/rooms/:id/messages (R4), membres seulement, rédigeable hors ligne. */
export const PostMessageRequest = z.object({
  clientId: z.uuid(),
  body: z.string().trim().min(1).max(4_000),
  kind: MessageKind.default('text'),
});
export type PostMessageRequest = z.infer<typeof PostMessageRequest>;

export const MessageView = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  roomId: z.uuid(),
  author: PublicAuthor,
  kind: z.enum(['text', 'standup', 'system']),
  body: z.string(),
  createdAt: z.iso.datetime(),
});
export type MessageView = z.infer<typeof MessageView>;

export const ListMessagesQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQuery>;

/** Ordre fixé par le serveur (created_at, id), du plus récent au plus ancien (04 § 5). */
export const ListMessagesResponse = z.object({ data: z.array(MessageView), page: PageInfo });
export type ListMessagesResponse = z.infer<typeof ListMessagesResponse>;
