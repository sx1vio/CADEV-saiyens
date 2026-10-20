import { z } from 'zod';
import { PageInfo } from './xp';

// Notifications dans l'application (S3, R3, Y3). Le texte est construit par le front à partir
// du type et du payload (le serveur ne renvoie pas de texte destiné à l'utilisateur).

export const NotificationType = z.enum([
  'match.request', // S3 : tu as été sollicité pour aider
  'answer.created', // S4 : nouvelle réponse à ta question
  'answer.accepted', // S4 : ta réponse a été validée
  'join.request', // R3 : demande pour rejoindre ta salle
  'join.decided', // R3 : ta demande a été acceptée ou refusée
  'task.completed', // R8 : ta contribution est acceptée
  'feedback.requested', // R6 : un membre de ta salle demande un retour ou une revue
  'feedback.taken', // R6 : quelqu'un relit ton projet
  'feedback.confirmed', // R6 : ta revue est confirmée par le demandeur
  'feedback.cancelled', // R6 : la demande que tu relisais a été retirée
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const NotificationView = z.object({
  id: z.uuid(),
  type: NotificationType,
  payload: z.record(z.string(), z.unknown()),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type NotificationView = z.infer<typeof NotificationView>;

export const ListNotificationsQuery = z.object({
  unread: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuery>;

export const ListNotificationsResponse = z.object({
  data: z.array(NotificationView),
  unreadCount: z.number().int(),
  page: PageInfo,
});
export type ListNotificationsResponse = z.infer<typeof ListNotificationsResponse>;

/** POST /api/v1/notifications/read : liste d'identifiants, ou toutes si `all`. */
export const ReadNotificationsRequest = z
  .object({
    ids: z.array(z.uuid()).min(1).max(100).optional(),
    all: z.literal(true).optional(),
  })
  .refine((v) => (v.ids === undefined) !== (v.all === undefined), {
    message: 'Fournir soit ids, soit all',
  });
export type ReadNotificationsRequest = z.infer<typeof ReadNotificationsRequest>;

export const ReadNotificationsResponse = z.object({ updated: z.number().int() });
export type ReadNotificationsResponse = z.infer<typeof ReadNotificationsResponse>;
