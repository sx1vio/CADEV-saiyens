/**
 * Temps réel (Y8, ADR-0007) : une seule connexion Server-Sent Events par onglet sur
 * GET /api/v1/events. Elle porte les notifications du compte connecté et les sujets publics
 * suivis par les pages ouvertes (« question:<id> », « room:<id> », 5 au plus).
 *
 * À chaque événement, on rafraîchit les données concernées du cache (lib/query) : la page se
 * met à jour sans recharger. Le navigateur reprend seul après une coupure (`retry: 3000`), et
 * Last-Event-ID évite de perdre une notification ; quand les sujets changent, on rouvre la
 * connexion en repartant du dernier identifiant reçu.
 *
 * Inactif avec le serveur simulé (mode local).
 */
import { useEffect } from 'react';
import { invalidate } from '@/lib/query';
import { clearApiReadCache } from '@/offline/api-cache';
import { api } from './index';

const MAX_TOPICS = 5;
const BASE = `${(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''}/api/v1`;

/** Événements publics émis par l'API (realtime.publisher.ts). */
export const PUBLIC_EVENTS = [
  'question.ai_hint',
  'question.matched',
  'answer.created',
  'answer.accepted',
  'task.updated',
  'room_message.created',
  'feedback.updated',
  'content.hidden',
  'dm.message',
] as const;

interface State {
  userKey: string | null;
  /** sujet → clés de cache à rafraîchir (une page peut suivre un sujet sous plusieurs clés) */
  topics: Map<string, Set<string>>;
  source: EventSource | null;
  lastEventId: string | null;
  reopen: ReturnType<typeof setTimeout> | null;
  onSessionEnded: (() => void) | null;
}

const state: State = {
  userKey: null,
  topics: new Map(),
  source: null,
  lastEventId: null,
  reopen: null,
  onSessionEnded: null,
};

/** URL du flux : sujets triés (ordre stable), reprise depuis le dernier événement reçu. */
export function streamUrl(topics: string[], lastEventId: string | null): string {
  const p = new URLSearchParams();
  const list = [...topics].sort().slice(0, MAX_TOPICS);
  if (list.length) p.set('topics', list.join(','));
  if (lastEventId) p.set('lastEventId', lastEventId);
  const q = p.toString();
  return `${BASE}/events${q ? `?${q}` : ''}`;
}

function close() {
  state.source?.close();
  state.source = null;
}

/** Ouvre (ou rouvre) le flux pour le compte et les sujets suivis. Exporté pour les tests. */
export function openStream() {
  close();
  const topics = [...state.topics.keys()];
  // Sans compte ni sujet, l'API refuse le flux (401) : rien à ouvrir.
  if (!state.userKey && topics.length === 0) return;
  const source = new EventSource(streamUrl(topics, state.lastEventId), { withCredentials: true });
  state.source = source;

  const remember = (e: MessageEvent) => {
    if (e.lastEventId) state.lastEventId = e.lastEventId;
  };
  source.addEventListener('notification.created', (e) => {
    remember(e as MessageEvent);
    if (state.userKey) invalidate(`notifications:${state.userKey}`);
    invalidate('conversations'); // nouveau message privé possible : badge et liste à jour
  });
  const refreshFollowed = () => {
    for (const keys of state.topics.values()) for (const k of keys) invalidate(k);
  };
  // BUG-033 : le serveur ne rejoue que les notifications, pas les événements publics. Ce qui
  // s'est passé entre le chargement d'une page et l'ouverture du flux (ou pendant une coupure)
  // serait perdu : à chaque ouverture et reconnexion, on relit les pages suivies et la boîte
  // de notifications.
  source.addEventListener('open', () => {
    refreshFollowed();
    if (state.userKey) invalidate(`notifications:${state.userKey}`);
  });
  // Les données publiques ne disent pas toujours quel sujet est concerné (content.hidden) :
  // on rafraîchit les pages suivies, cinq au plus.
  for (const event of PUBLIC_EVENTS) source.addEventListener(event, refreshFollowed);
  // Message privé reçu : liste des conversations et compteur de non-lus.
  source.addEventListener('signal.dm', () => invalidate('conversations'));
  source.addEventListener('session.ended', () => {
    close();
    void clearApiReadCache(); // session terminée ailleurs : on ne garde rien de ce compte
    state.userKey = null;
    state.onSessionEnded?.();
  });
}

/** Rouvre la connexion au prochain tour (plusieurs changements de sujets = une seule reconnexion). */
function scheduleOpen() {
  if (api.mode !== 'http' || typeof EventSource === 'undefined') return;
  if (state.reopen) clearTimeout(state.reopen);
  state.reopen = setTimeout(() => {
    state.reopen = null;
    openStream();
  }, 50);
}

/** Flux personnel du compte connecté (notifications). `null` à la déconnexion. */
export function useUserStream(userKey: string | null, onSessionEnded?: () => void) {
  useEffect(() => {
    state.userKey = userKey;
    state.onSessionEnded = onSessionEnded ?? null;
    if (!userKey) state.lastEventId = null;
    scheduleOpen();
  }, [userKey, onSessionEnded]);
}

/** Suit un sujet sous une clé de cache ; renvoie la fonction qui arrête de le suivre. */
export function followTopic(topic: string, cacheKey: string): () => void {
  const keys = state.topics.get(topic) ?? new Set<string>();
  keys.add(cacheKey);
  state.topics.set(topic, keys);
  scheduleOpen();
  return () => {
    const current = state.topics.get(topic);
    current?.delete(cacheKey);
    if (current && current.size === 0) state.topics.delete(topic);
    scheduleOpen();
  };
}

/** La page suit un sujet public tant qu'elle est affichée ; `cacheKey` est rafraîchie à chaque événement. */
export function useTopic(topic: string | null, cacheKey: string) {
  useEffect(() => (topic ? followTopic(topic, cacheKey) : undefined), [topic, cacheKey]);
}
