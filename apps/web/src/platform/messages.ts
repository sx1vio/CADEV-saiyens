/** Messagerie privée entre membres (API /api/v1/conversations). */
import type {
  ConversationsResponse,
  DirectMessageView,
  DirectMessagesResponse,
} from '@devhub/contracts';
import { DomainError } from '@/services/types';

const BASE = `${(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''}/api/v1`;

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['X-DevHub-Client'] = 'web';
    headers['Idempotency-Key'] = crypto.randomUUID();
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new DomainError('network.offline');
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string };
    throw new DomainError(err.code ?? `http.${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export type { ConversationsResponse, DirectMessageView, DirectMessagesResponse };

export const messages = {
  list: () => send<ConversationsResponse>('GET', '/conversations'),
  start: (handle: string) =>
    send<{ id: string }>('POST', '/conversations', { handle }).then((r) => r.id),
  thread: (id: string, before?: string) =>
    send<DirectMessagesResponse>(
      'GET',
      `/conversations/${id}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
  send: (id: string, body: string, clientId: string) =>
    send<DirectMessageView>('POST', `/conversations/${id}/messages`, { body, clientId }),
  read: (id: string) => send<void>('POST', `/conversations/${id}/read`),
  block: (handle: string) => send<void>('POST', `/users/${encodeURIComponent(handle)}/block`),
  unblock: (handle: string) => send<void>('DELETE', `/users/${encodeURIComponent(handle)}/block`),
  report: (id: string, reason: string) =>
    send<void>('POST', '/reports', { targetType: 'direct_message', targetId: id, reason }),
};

export const MESSAGE_ERRORS: Record<string, string> = {
  'message.unavailable': 'Impossible d’écrire à ce membre pour le moment.',
  'message.self': 'Tu ne peux pas t’écrire à toi-même.',
  rate_limited: 'Tu envoies beaucoup de messages : patiente une minute.',
  not_found: 'Conversation introuvable.',
  'network.offline': 'Pas de connexion. Ton message n’est pas parti.',
};
