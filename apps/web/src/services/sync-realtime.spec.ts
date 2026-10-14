import { describe, expect, it } from 'vitest';
import * as m from './http-mappers';
import { streamUrl } from './realtime';

const question = {
  title: 'nginx renvoie 502 derrière Docker',
  body: 'Le conteneur répond 502.',
  tried: 'Redémarrer nginx',
  codeSnippet: '',
  codeLang: 'nginx',
  urgency: 'high' as const,
  tagIds: ['docker', 'nginx'],
};

describe('file hors ligne → POST /sync (O2)', () => {
  it('une question a le même corps en direct et dans un lot : même empreinte d’idempotence', () => {
    const direct = m.askQuestion(question, 'c1', 'fr');
    const action = m.syncAction('c1', { type: 'question', payload: question }, 'fr');
    expect(action).toEqual({ opId: 'c1', type: 'question.create', payload: direct });
    expect(direct).toMatchObject({
      clientId: 'c1',
      codeSnippet: null,
      tagSlugs: ['docker', 'nginx'],
      body: "Le conteneur répond 502.\n\n**Ce que j'ai essayé**\n\nRedémarrer nginx",
    });
  });

  it('réponse, message et prise de tâche : le clientId est l’opId', () => {
    expect(
      m.syncAction(
        'a1',
        { type: 'answer', payload: { questionId: 'q1', body: 'Essaie ça', questionTitle: 'x' } },
        'fr',
      ),
    ).toEqual({
      opId: 'a1',
      type: 'answer.create',
      payload: { questionId: 'q1', clientId: 'a1', body: 'Essaie ça' },
    });
    expect(
      m.syncAction(
        'm1',
        {
          type: 'message',
          payload: { roomId: 'r1', body: 'Salut', kind: 'message', roomName: 'P' },
        },
        'fr',
      ),
    ).toEqual({
      opId: 'm1',
      type: 'room_message.create',
      payload: { roomId: 'r1', clientId: 'm1', body: 'Salut', kind: 'text' },
    });
    expect(
      m.syncAction('t1', { type: 'take-task', payload: { taskId: 'tk', taskTitle: 'x' } }, 'fr'),
    ).toEqual({
      opId: 't1',
      type: 'task.take',
      payload: { taskId: 'tk' },
    });
  });

  it('résultats : appliquée ou doublon = terminée ; ignorée = à réessayer ; refus et conflit = erreur', () => {
    const r = (
      status: 'applied' | 'duplicate' | 'skipped' | 'rejected' | 'conflict',
      code?: string,
    ) =>
      m.syncOutcome({
        opId: 'o',
        status,
        httpStatus: 200,
        ...(code ? { error: { code, title: '', status: 409 } } : {}),
      });
    expect(r('applied')).toEqual({ opId: 'o', outcome: 'done' });
    expect(r('duplicate')).toEqual({ opId: 'o', outcome: 'done' });
    expect(r('skipped', 'rate_limited')).toEqual({
      opId: 'o',
      outcome: 'retry',
      code: 'rate_limited',
    });
    expect(r('rejected', 'question.not_open')).toEqual({
      opId: 'o',
      outcome: 'error',
      code: 'question.not_open',
    });
    expect(r('conflict')).toEqual({ opId: 'o', outcome: 'error', code: 'conflict' });
  });
});

describe('flux temps réel (Y8)', () => {
  it('sujets triés, cinq au plus, reprise depuis le dernier événement', () => {
    const topics = ['room:b', 'question:a', 'question:c', 'room:d', 'room:e', 'room:f'];
    const url = new URL(streamUrl(topics, '42'), 'https://devhub.test');
    expect(url.pathname).toBe('/api/v1/events');
    expect(url.searchParams.get('topics')!.split(',')).toEqual([
      'question:a',
      'question:c',
      'room:b',
      'room:d',
      'room:e',
    ]);
    expect(url.searchParams.get('lastEventId')).toBe('42');
    expect(streamUrl([], null)).toBe('/api/v1/events');
  });
});
