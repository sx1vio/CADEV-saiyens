import { z } from 'zod';

// Messagerie privée entre deux membres (conversations à deux, temps réel par le sujet dm:<id>).

export const ConversationPeer = z.object({
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  country: z.string().nullable(),
  /** Compte supprimé ou suspendu : la conversation reste lisible, on ne peut plus écrire. */
  active: z.boolean(),
});
export type ConversationPeer = z.infer<typeof ConversationPeer>;

export const ConversationView = z.object({
  id: z.uuid(),
  peer: ConversationPeer,
  lastMessage: z.object({ body: z.string(), at: z.iso.datetime(), mine: z.boolean() }).nullable(),
  unread: z.number().int(),
  /** J'ai bloqué cette personne */
  blocked: z.boolean(),
  /** Je peux écrire (personne active, aucun blocage dans un sens ou dans l'autre) */
  canWrite: z.boolean(),
});
export type ConversationView = z.infer<typeof ConversationView>;

export const ConversationsResponse = z.object({
  data: z.array(ConversationView),
  unreadTotal: z.number().int(),
});
export type ConversationsResponse = z.infer<typeof ConversationsResponse>;

/** POST /api/v1/conversations : ouvre (ou retrouve) la conversation avec ce membre. */
export const StartConversationRequest = z.object({
  handle: z.string().trim().min(1).max(40),
});
export type StartConversationRequest = z.infer<typeof StartConversationRequest>;

export const DirectMessageView = z.object({
  id: z.uuid(),
  mine: z.boolean(),
  body: z.string(),
  createdAt: z.iso.datetime(),
  /** Masqué par la modération : le texte n'est plus renvoyé. */
  hidden: z.boolean(),
});
export type DirectMessageView = z.infer<typeof DirectMessageView>;

/** GET /api/v1/conversations/:id/messages?before=<iso> : 50 messages, du plus ancien au plus récent. */
export const DirectMessagesResponse = z.object({
  conversation: ConversationView,
  data: z.array(DirectMessageView),
  hasMore: z.boolean(),
});
export type DirectMessagesResponse = z.infer<typeof DirectMessagesResponse>;

export const SendDirectMessageRequest = z.object({
  body: z.string().trim().min(1).max(4000),
  /** Identifiant généré par le client : renvoyer le même message ne le duplique pas. */
  clientId: z.uuid(),
});
export type SendDirectMessageRequest = z.infer<typeof SendDirectMessageRequest>;
