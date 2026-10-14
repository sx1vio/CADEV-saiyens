import { describe, expect, it } from 'vitest';
import { sseFrame } from '../../modules/notifications/http/events.controller';
import type { Env } from '../config/env';
import { RealtimeHub, type Subscriber } from './realtime.hub';
import { PUBLIC_CHANNEL, USER_CHANNEL } from './realtime.publisher';

const hub = () => new RealtimeHub({ PROCESS_ROLE: 'worker' } as Env);

const subscriber = (userId: string | null, topics: string[] = []) => {
  const seen: string[] = [];
  const s: Subscriber = {
    userId,
    topics: new Set(topics),
    onUserEvent: () => seen.push('user'),
    onPublicEvent: (event, data) => seen.push(`${event}:${JSON.stringify(data)}`),
  };
  return { s, seen };
};

describe('RealtimeHub', () => {
  it('distribue les événements personnels au seul utilisateur concerné', () => {
    const h = hub();
    const awa = subscriber('awa');
    const moussa = subscriber('moussa');
    h.add(awa.s);
    h.add(moussa.s);
    h.dispatch(USER_CHANNEL, JSON.stringify({ u: 'awa' }));
    expect(awa.seen).toEqual(['user']);
    expect(moussa.seen).toEqual([]);
  });

  it('distribue les événements publics aux abonnés du sujet', () => {
    const h = hub();
    const viewer = subscriber(null, ['question:q1']);
    const other = subscriber(null, ['question:q2']);
    h.add(viewer.s);
    h.add(other.s);
    h.dispatch(
      PUBLIC_CHANNEL,
      JSON.stringify({ t: 'question:q1', e: 'answer.created', d: { a: '1' } }),
    );
    expect(viewer.seen).toEqual(['answer.created:{"a":"1"}']);
    expect(other.seen).toEqual([]);
  });

  it('ignore un message illisible, et oublie un abonné retiré', () => {
    const h = hub();
    const awa = subscriber('awa');
    const remove = h.add(awa.s);
    h.dispatch(USER_CHANNEL, 'pas du json');
    expect(h.size).toBe(1);
    remove();
    h.dispatch(USER_CHANNEL, JSON.stringify({ u: 'awa' }));
    expect(awa.seen).toEqual([]);
    expect(h.size).toBe(0);
  });
});

describe('sseFrame', () => {
  it('écrit un événement SSE, avec ou sans identifiant', () => {
    expect(sseFrame('answer.created', { a: 1 }, '42')).toBe(
      'id: 42\nevent: answer.created\ndata: {"a":1}\n\n',
    );
    expect(sseFrame('question.matched', {})).toBe('event: question.matched\ndata: {}\n\n');
  });
});
