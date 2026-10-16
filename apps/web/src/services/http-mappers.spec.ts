import { describe, expect, it } from 'vitest';
import * as m from './http-mappers';

const awa = { handle: 'awa', displayName: 'Awa', avatarUrl: null, isDemo: false };
const moussa = { handle: 'moussa', displayName: 'Moussa', avatarUrl: null, isDemo: true };
const at = '2026-10-16T10:00:00.000Z';

describe('identifiants du mode http', () => {
  it('un utilisateur est identifié par son handle, une étiquette par son slug', () => {
    expect(m.summary(awa)).toMatchObject({ id: 'awa', handle: 'awa', country: '', isDemo: false });
    expect(m.tag({ slug: 'docker', label: 'Docker' })).toEqual({
      id: 'docker',
      slug: 'docker',
      label: 'Docker',
    });
  });

  it('« Je cherche » : aller-retour entre la liste du front et le texte de l’API', () => {
    expect(m.lookingForToApi(['project', 'team'])).toBe('project,team');
    expect(m.lookingForFromApi('project, team, autre')).toEqual(['project', 'team']);
    expect(m.lookingForToApi([])).toBeNull();
    expect(m.lookingForFromApi(null)).toEqual([]);
  });

  it('décalage UTC d’un fuseau IANA', () => {
    expect(m.utcOffset('Africa/Abidjan')).toBe(0);
    expect(m.utcOffset('Africa/Lagos')).toBe(1);
    expect(m.utcOffset('Mars/Olympus')).toBe(0);
    expect(m.utcOffset(null)).toBe(0);
  });
});

describe('questions', () => {
  const detail = {
    id: 'q1',
    title: 'nginx renvoie 502 derrière Docker',
    status: 'resolved' as const,
    urgency: 'high' as const,
    lang: 'fr' as const,
    tags: [{ slug: 'docker', label: 'Docker' }],
    answerCount: 1,
    createdAt: at,
    resolvedAt: at,
    author: awa,
    body: 'Le conteneur répond 502.',
    codeSnippet: null,
    version: 1,
    aiHint: 'Vérifie le réseau Docker.',
    aiStatus: 'done' as const,
    acceptedAnswerId: 'a1',
    answers: [
      {
        id: 'a1',
        body: 'Utilise le nom du service.',
        isAccepted: true,
        helpfulCount: 2,
        version: 1,
        createdAt: at,
        author: moussa,
      },
    ],
    helpers: [
      {
        helper: moussa,
        wave: 1,
        rank: 1,
        reasons: [
          { code: 'solved_similar', params: { count: 3, tags: ['Docker', 'nginx'] } },
          { code: 'can_help', params: { tag: 'Docker' } },
        ],
        notifiedAt: at,
        claimedAt: at,
      },
    ],
  };

  it('détail : auteur, réponses, sollicitations et raisons lisibles', () => {
    const q = m.questionDetail(detail);
    expect(q).toMatchObject({
      authorId: 'awa',
      tagIds: ['docker'],
      status: 'resolved',
      aiStatus: 'ready',
      aiHintSource: 'ai',
      codeSnippet: '',
      claimedBy: { id: 'moussa' },
    });
    expect(q.answers[0]).toMatchObject({ authorId: 'moussa', questionId: 'q1', votedByMe: false });
    expect(q.matches[0]).toMatchObject({ helperId: 'moussa', rank: 1, claimedAt: at });
    expect(q.matches[0].reasons).toEqual([
      {
        kind: 'experience',
        key: 'match.reason.solved',
        params: { count: 3, tags: 'Docker, nginx' },
      },
      { kind: 'can-help', key: 'match.reason.canHelp', params: { tag: 'Docker', tags: 'Docker' } },
    ]);
  });

  it('une question close sans validation reste non résolue ; IA ignorée = échec', () => {
    const q = m.questionDetail({ ...detail, status: 'closed', aiStatus: 'skipped' });
    expect(q.status).toBe('open');
    expect(q.aiStatus).toBe('failed');
  });
});

describe('salles et tâches', () => {
  const summary = {
    id: 'r1',
    code: 'k7m2q9xa',
    name: 'Paylink',
    description: 'Paiements mobile money.',
    state: 'looking_for_help' as const,
    visibility: 'unlisted' as const,
    stack: [{ slug: 'nodejs', label: 'Node.js' }],
    repo: { fullName: 'awa/paylink', url: 'https://github.com/awa/paylink', verified: true },
    demoUrl: null,
    owner: awa,
    memberCount: 2,
    openTaskCount: 1,
    createdAt: at,
    lastActivityAt: at,
  };
  const task = {
    id: 't1',
    roomId: 'r1',
    title: 'Ajouter Orange Money',
    description: null,
    level: 'hard' as const,
    status: 'in_review' as const,
    assignee: moussa,
    prUrl: 'https://github.com/awa/paylink/pull/4',
    verification: 'github_verified' as const,
    fromGithubIssue: false,
    version: 2,
    createdAt: at,
    takenAt: at,
    completedAt: null,
  };

  it('fiche : état, visibilité, code d’invitation, rôle du visiteur, fil chronologique', () => {
    const r = m.roomDetail(
      {
        ...summary,
        members: [{ user: awa, role: 'owner', joinedAt: at }],
        viewer: { role: 'maintainer', joinRequest: null },
      },
      {
        tasks: [task],
        messages: [
          {
            id: 'm2',
            clientId: 'c2',
            roomId: 'r1',
            author: awa,
            kind: 'text',
            body: 'Deux',
            createdAt: at,
          },
          {
            id: 'm1',
            clientId: 'c1',
            roomId: 'r1',
            author: moussa,
            kind: 'standup',
            body: 'Un',
            createdAt: at,
          },
        ],
        requests: [
          {
            id: 'j1',
            roomId: 'r1',
            user: moussa,
            message: null,
            status: 'pending',
            createdAt: at,
            decidedAt: null,
          },
          {
            id: 'j2',
            roomId: 'r1',
            user: moussa,
            message: null,
            status: 'refused',
            createdAt: at,
            decidedAt: at,
          },
        ],
      },
    );
    expect(r).toMatchObject({
      ownerId: 'awa',
      state: 'beta',
      visibility: 'private',
      inviteCode: 'k7m2q9xa',
      repoVerified: true,
      myMembership: 'member',
      members: [{ id: 'awa' }],
    });
    expect(r.messages.map((x) => [x.body, x.kind])).toEqual([
      ['Un', 'standup'],
      ['Deux', 'message'],
    ]);
    expect(r.requests.map((x) => x.id)).toEqual(['j1']);
    expect(r.tasks[0]).toMatchObject({
      level: 'advanced',
      status: 'review',
      assigneeId: 'moussa',
      prVerified: true,
      description: '',
      githubIssueId: null,
    });
  });

  it('états et niveaux : conversions dans les deux sens', () => {
    for (const s of ['idea', 'building', 'beta', 'live'] as const) {
      expect(m.roomItem({ ...summary, state: m.roomStateToApi(s) }).state).toBe(s);
    }
    expect(m.levelToApi('starter')).toBe('first_step');
    expect(m.levelToApi('intermediate')).toBe('medium');
    expect(m.levelToApi('advanced')).toBe('hard');
  });
});

describe('notifications, statut, modération', () => {
  it('les libellés du front trouvent auteur, titre, salle et tâche', () => {
    const n = m.notification(
      {
        id: 'n1',
        type: 'answer.created',
        payload: { questionId: 'q1', title: 'nginx 502', by: 'moussa', reasons: [] },
        readAt: null,
        createdAt: at,
      },
      'awa',
    );
    expect(n).toMatchObject({
      type: 'answer',
      userId: 'awa',
      payload: { questionId: 'q1', title: 'nginx 502', author: 'moussa' },
    });
    expect(n.payload).not.toHaveProperty('reasons');
    const done = m.notification(
      {
        id: 'n2',
        type: 'task.completed',
        payload: { roomName: 'Paylink', taskTitle: 'Orange Money', points: 15 },
        readAt: at,
        createdAt: at,
      },
      'moussa',
    );
    expect(done).toMatchObject({
      type: 'task-done',
      payload: { room: 'Paylink', task: 'Orange Money', points: 15 },
    });
  });

  it('statut Systalink : non branché et sans sonde = en attente, pas en panne', () => {
    const s = m.status(
      {
        overall: 'unknown',
        lastBackupAt: at,
        services: [
          { service: 'vps', state: 'operational', latencyMs: 12, checkedAt: at },
          { service: 'database', state: 'down', latencyMs: null, checkedAt: at },
          { service: 'backup', state: 'unknown', latencyMs: null, checkedAt: null },
          { service: 'mail', state: 'not_configured', latencyMs: null, checkedAt: at },
        ],
      },
      new Date(at),
    );
    expect(s.services.map((x) => [x.id, x.status])).toEqual([
      ['vps', 'up'],
      ['database', 'down'],
      ['backup', 'pending'],
      ['mail', 'pending'],
    ]);
    expect(s).toMatchObject({ source: 'live', lastBackupAt: at });
    expect(s.services[2].checkedAt).toBe(at);
  });

  it('modération : message de salle et statut « retiré »', () => {
    expect(m.reportTypeToApi('message')).toBe('room_message');
    const r = m.report({
      id: 'r1',
      targetType: 'room_message',
      targetId: 'm1',
      reason: 'Spam',
      status: 'actioned',
      createdAt: at,
      reporter: awa,
      target: { excerpt: 'Achetez…', author: moussa, hidden: true },
      openReportsOnTarget: 0,
      handledAt: at,
    });
    expect(r).toMatchObject({
      targetType: 'message',
      status: 'removed',
      targetLabel: 'Achetez…',
      reporterId: 'awa',
    });
  });
});

describe('modification et conflit de version (O4)', () => {
  const opId = '7f1c2a9e-3b4d-4e5f-8a6b-1c2d3e4f5a6b';

  it('une modification hors ligne part par /sync avec sa version de départ', () => {
    expect(
      m.syncAction(
        opId,
        {
          type: 'edit-question',
          payload: {
            questionId: 'q1',
            baseVersion: 2,
            title: 'Titre',
            body: 'Texte',
            codeSnippet: '',
          },
        },
        'fr',
      ),
    ).toEqual({
      opId,
      type: 'question.update',
      payload: { questionId: 'q1', title: 'Titre', body: 'Texte', codeSnippet: null },
      baseVersion: 2,
    });
    expect(
      m.syncAction(
        opId,
        {
          type: 'edit-answer',
          payload: {
            answerId: 'a1',
            questionId: 'q1',
            questionTitle: 'T',
            body: 'R',
            baseVersion: 3,
          },
        },
        'fr',
      ),
    ).toEqual({
      opId,
      type: 'answer.update',
      payload: { answerId: 'a1', body: 'R' },
      baseVersion: 3,
    });
  });

  it('un conflit de /sync garde la version en ligne pour l’écran de conflit', () => {
    expect(
      m.syncOutcome({
        opId,
        status: 'conflict',
        httpStatus: 409,
        data: { server: { version: 4, title: 'En ligne', body: 'Corps', codeSnippet: null } },
      }),
    ).toEqual({
      opId,
      outcome: 'error',
      code: 'version_conflict',
      server: { kind: 'question', version: 4, title: 'En ligne', body: 'Corps', codeSnippet: '' },
    });
  });

  it('version serveur : question, réponse, ou rien d’exploitable', () => {
    expect(m.serverText({ version: 2, body: 'Réponse' })).toEqual({
      kind: 'answer',
      version: 2,
      body: 'Réponse',
    });
    expect(m.serverText(undefined)).toBeUndefined();
    expect(m.serverText({ body: 'sans version' })).toBeUndefined();
  });
});

describe('impact (Y2)', () => {
  it('affiche les chiffres calculés par l’API, jamais des zéros écrits en dur (BUG-032)', () => {
    expect(
      m.impact({
        registeredDevs: 40,
        questionsAsked: 20,
        questionsResolved: 12,
        medianFirstResponseMinutes: 7,
        countries: 5,
        projectRooms: 3,
        verifiedContributions: 2,
        crossLanguageAnswers: 1,
        computedAt: at,
      }),
    ).toMatchObject({ devs: 40, verifiedContributions: 2, crossLanguage: 1, weekly: [] });
  });
});

describe('journal de modération (M4)', () => {
  it('convertit les décisions et ne donne un curseur que s’il reste des pages', () => {
    const entry = {
      id: '1b4e28ba-2fa1-41d2-883f-0016d3cca427',
      action: 'dismiss_report' as const,
      targetType: 'user' as const,
      targetId: '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b',
      reason: 'Signalement rejeté',
      admin: awa,
      createdAt: at,
    };
    expect(m.auditPage({ data: [entry], page: { nextCursor: 'c2', hasMore: true } })).toEqual({
      entries: [
        {
          id: entry.id,
          action: 'dismiss',
          targetType: 'user',
          targetId: entry.targetId,
          reason: 'Signalement rejeté',
          admin: m.summary(awa),
          createdAt: at,
        },
      ],
      next: 'c2',
    });
    expect(
      m.auditPage({
        data: [{ ...entry, action: 'hide_content', targetType: 'room_message' }],
        page: { nextCursor: 'c3', hasMore: false },
      }),
    ).toMatchObject({ entries: [{ action: 'hide', targetType: 'message' }], next: null });
  });
});
