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

describe('préférence e-mail (Y3)', () => {
  const me = {
    id: '00000000-0000-4000-8000-000000000001',
    handle: 'awa',
    displayName: 'Awa',
    avatarUrl: null,
    email: 'awa@example.org',
    emailVerified: true,
    bio: null,
    country: 'CI',
    timezone: 'Africa/Abidjan',
    languages: ['fr' as const],
    uiLang: 'fr' as const,
    emailNotifications: false,
    lookingFor: null,
    githubLinked: true,
    githubCreatedAt: null,
    codeOfConductAcceptedAt: null,
    isAdmin: false,
    isDemo: false,
    createdAt: at,
    privacy: {
      unlisted: false,
      hideCountry: true,
      hideTimezone: true,
      hideAvailability: false,
      hideStats: false,
    },
    trust: {
      githubLinked: true,
      githubAccountYears: null,
      emailVerified: true,
      demo: false,
      founder: true,
    },
  };

  it('PR14 : GET /me apporte les réglages de confidentialité tels qu’ils s’appliquent', () => {
    expect(m.user(me).privacy).toEqual({
      unlisted: false,
      hideCountry: true,
      hideTimezone: true,
      hideAvailability: false,
      hideStats: false,
    });
  });

  it('GET /me : la préférence et la présence d’une adresse arrivent, jamais l’adresse elle-même', () => {
    const u = m.user(me);
    expect(u).toMatchObject({ emailNotifications: false, hasEmail: true });
    expect(u).not.toHaveProperty('email');
    expect(m.user({ ...me, email: null, emailNotifications: true })).toMatchObject({
      emailNotifications: true,
      hasEmail: false,
    });
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
    deployment: null,
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

describe('historique de disponibilité (Y5)', () => {
  it('un jour sans sonde reste null (« pas de mesure »), jamais 100 %', () => {
    const h = m.statusHistory({
      days: 2,
      services: [
        {
          service: 'backup',
          uptimePercent: 66.7,
          checks: 3,
          daily: [
            { date: '2026-10-17', uptimePercent: null, checks: 0 },
            { date: '2026-10-18', uptimePercent: 66.7, checks: 3 },
          ],
        },
      ],
    });
    expect(h.services[0]).toMatchObject({ id: 'backup', name: 'Sauvegarde cloud' });
    expect(h.services[0]!.daily.map((d) => d.uptimePercent)).toEqual([null, 66.7]);
  });
});

describe('mission et Contacter (PR4)', () => {
  it('le drapeau mission arrive des disponibilités et des cartes de Découvrir', () => {
    expect(m.availabilityFromApi({ now: false, mission: true }).forMission).toBe(true);
    expect(m.availabilityFromApi({ now: true }).forMission).toBe(false);
    expect(m.availabilityFromApi(null).forMission).toBe(false);
  });

  it('la notification « contact » garde le message et l’expéditeur', () => {
    const n = m.notification(
      {
        id: 'n9',
        type: 'contact.request',
        payload: { senderId: 'x', by: 'moussa', byName: 'Moussa', message: 'Une mission ?' },
        readAt: null,
        createdAt: at,
      },
      'awa',
    );
    expect(n).toMatchObject({
      type: 'contact',
      payload: { by: 'moussa', byName: 'Moussa', message: 'Une mission ?' },
    });
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

describe('questions similaires (S7)', () => {
  it('cherche l’un des mots significatifs du titre, sans doublon', () => {
    expect(m.similarSearch('Nginx renvoie 502 derrière Docker, nginx')).toBe(
      'nginx or renvoie or derrière or docker',
    );
  });

  it('écarte les mots courts et les opérateurs de recherche', () => {
    expect(m.similarSearch('le -v de "git"')).toBeUndefined();
    expect(m.similarSearch('docker-compose -rm')).toBe('docker-compose');
  });

  it('trois suggestions au maximum', () => {
    expect(m.SIMILAR_LIMIT).toBe(3);
  });
});

describe('demandes de retour et de revue (R6)', () => {
  it('vue de l’API → front : type, statut, comptes identifiés par leur handle', () => {
    const f = m.feedbackRequest({
      id: 'f1',
      kind: 'code_review',
      status: 'in_progress',
      url: 'https://github.com/awa/kora/pull/12',
      note: 'Les erreurs du paiement',
      room: { id: 'r1', code: 'abcd2345', name: 'Kora' },
      stack: [{ slug: 'nodejs', label: 'Node.js' }],
      requester: awa,
      reviewer: moussa,
      createdAt: at,
      confirmedAt: null,
    });
    expect(f).toMatchObject({
      roomId: 'r1',
      kind: 'code-review',
      status: 'in-progress',
      requesterId: 'awa',
      reviewerId: 'moussa',
      tags: [{ id: 'nodejs', slug: 'nodejs', label: 'Node.js' }],
    });
  });

  it('notification de confirmation : `count` choisit le texte sans Proof XP', () => {
    const n = m.notification(
      {
        id: 'n3',
        type: 'feedback.confirmed',
        payload: { roomName: 'Kora', code: 'abcd2345', kind: 'feedback', by: 'Awa', points: 0 },
        readAt: null,
        createdAt: at,
      },
      'moussa',
    );
    expect(n).toMatchObject({
      type: 'feedback-confirmed',
      payload: { room: 'Kora', code: 'abcd2345', author: 'Awa', count: 0 },
    });
  });
});
