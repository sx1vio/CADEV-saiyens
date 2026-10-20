/**
 * Implémentation « http » du contrat DevHubApi : la vraie API (docs/architecture/06-api.md).
 * Même origine en production (Caddy route /api vers l'API, ADR-0011) ; VITE_API_URL sert
 * seulement à viser une autre origine en développement.
 *
 * - Chaque écriture porte `X-DevHub-Client: web` (protection CSRF, 10-securite.md) et une
 *   `Idempotency-Key` (le client_id quand il existe : un rejeu hors ligne ne crée pas de doublon).
 * - Les réponses sont converties vers les types du front dans http-mappers.ts.
 * - Une fonction absente de l'API (hors périmètre du MVP, ADR-0016) lève `feature.unavailable`.
 */
import type {
  ConfirmFeedbackResponse,
  FeedbackRequestView,
  ListFeedbackRequestsResponse,
  AcceptAnswerResponse,
  AskQuestionResponse,
  CompleteTaskResponse,
  DiscoverDevsResponse,
  ImpactResponse,
  JoinRoomResponse,
  LeaderboardMapResponse,
  LeaderboardResponse,
  ListJoinRequestsResponse,
  ListMessagesResponse,
  ListNotificationsResponse,
  ListPairSessionsResponse,
  ListQuestionsResponse,
  ListAuditResponse,
  ListReportsResponse,
  ListRoomsResponse,
  ListTagsResponse,
  ListTasksResponse,
  MeResponse,
  MessageView,
  PairSessionView,
  PassportResponse,
  PostAnswerResponse,
  ProofsResponse,
  QuestionDetail as ApiQuestionDetail,
  RoomDetail as ApiRoomDetail,
  StatusHistoryResponse,
  StatusResponse,
  SuggestTasksResponse,
  SyncResponse,
  TaskView,
  TranslationResponse,
  UpdateAnswerResponse,
  UpdateMeRequest,
  DeleteMeRequest,
  UpdateQuestionResponse,
  DeploymentChallenge,
  SystalinkEcosystemResponse,
  VerifyDeploymentResponse,
} from '@devhub/contracts';
import type { DevHubApi, QuestionTab } from './api';
import { claimApiReadCache, clearApiReadCache, releaseApiReadCache } from '@/offline/api-cache';
import * as m from './http-mappers';
import { DomainError, type User } from './types';

const BASE = `${(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''}/api/v1`;

type Query = Record<string, string | number | boolean | undefined>;

async function call<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['X-DevHub-Client'] = 'web';
    headers['Idempotency-Key'] = idempotencyKey ?? crypto.randomUUID();
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
    const err = (await res.json().catch(() => ({}))) as {
      code?: string;
      params?: Record<string, string | number>;
      server?: unknown;
    };
    throw new DomainError(err.code ?? `http.${res.status}`, err.params, m.serverText(err.server));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string, query: Query = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return call<T>('GET', s ? `${path}?${s}` : path);
};
const post = <T>(path: string, body?: unknown, key?: string) =>
  call<T>('POST', path, body ?? {}, key);

const unavailable = (): never => {
  throw new DomainError('feature.unavailable');
};

/** La recherche plein texte exige au moins 2 caractères (06-api.md). */
const search = (q?: string) => (q && q.trim().length >= 2 ? q.trim().slice(0, 200) : undefined);

/** S7 : questions proches d'un texte, la question courante exclue. */
async function similar(text: string, excludeId?: string) {
  const q = m.similarSearch(text);
  if (!q) return [];
  const res = await get<ListQuestionsResponse>('/questions', { q, limit: m.SIMILAR_LIMIT + 1 });
  return res.data
    .filter((x) => x.id !== excludeId)
    .slice(0, m.SIMILAR_LIMIT)
    .map(m.questionItem);
}

const uiLang = (): 'fr' | 'en' => (document.documentElement.lang === 'en' ? 'en' : 'fr');

const QUESTION_TAB: Record<QuestionTab, Query> = {
  'for-me': { status: 'open', forMe: true },
  // S16 : la file « Personne n'a encore répondu », la plus urgente puis la plus ancienne d'abord.
  unanswered: { status: 'open', unanswered: true, sort: 'waiting' },
  resolved: { status: 'resolved' },
  all: {},
  mine: { mine: true },
};

async function session(): Promise<User | null> {
  const me = await get<MeResponse>('/me').catch((e: unknown) => {
    if (e instanceof DomainError && (e.code === 'auth.required' || e.code === 'http.401'))
      return null;
    throw e;
  });
  if (!me) {
    // L'API a répondu (pas une coupure) : sans session, on ne laisse rien du dernier compte.
    await releaseApiReadCache();
    return null;
  }
  // Un autre compte sur le même appareil ne relit pas le cache du précédent.
  await claimApiReadCache(me.handle);
  const passport = await get<PassportResponse>(`/u/${me.handle}`).catch(() => null);
  return m.user(me, passport);
}

async function sessionOrThrow(): Promise<User> {
  const u = await session();
  if (!u) throw new DomainError('auth.required');
  return u;
}

async function room(code: string) {
  const r = await get<ApiRoomDetail>(`/rooms/${encodeURIComponent(code)}`);
  const member = r.viewer?.role != null;
  const manager = r.viewer?.role === 'owner' || r.viewer?.role === 'maintainer';
  const [tasks, messages, requests, feedback] = await Promise.all([
    get<ListTasksResponse>(`/rooms/${r.id}/tasks`).catch(() => ({ data: [] as TaskView[] })),
    member
      ? get<ListMessagesResponse>(`/rooms/${r.id}/messages`, { limit: 100 }).then((x) => x.data)
      : Promise.resolve([] as MessageView[]),
    manager
      ? get<ListJoinRequestsResponse>(`/rooms/${r.id}/join-requests`).then((x) => x.data)
      : Promise.resolve([]),
    get<ListFeedbackRequestsResponse>(`/rooms/${r.id}/feedback-requests`)
      .then((x) => x.data)
      .catch(() => [] as FeedbackRequestView[]),
  ]);
  return m.roomDetail(r, { tasks: tasks.data, messages, requests, feedback });
}

export const httpApi: DevHubApi = {
  mode: 'http',

  getSession: session,
  importGitHub: () => {
    // Connexion par OAuth GitHub : l'API redirige vers GitHub, puis revient sur l'application.
    const returnTo = `${location.pathname}${location.search}`;
    window.location.href = `${BASE}/auth/github?returnTo=${encodeURIComponent(returnTo)}`;
    return new Promise(() => {});
  },
  signUpWithGitHub: sessionOrThrow,
  loginDemo: async () => unavailable(),
  listDemoAccounts: async () => [],
  logout: async () => {
    try {
      await post('/auth/logout');
    } finally {
      // O1 : même si la déconnexion n'a pas joint le serveur (hors ligne), rien de ce compte
      // ne reste lisible sur l'appareil.
      await clearApiReadCache();
    }
  },
  updateMe: async (input) => {
    const body: UpdateMeRequest = {};
    if (input.displayName !== undefined) body.displayName = input.displayName;
    if (input.bio !== undefined) body.bio = input.bio || null;
    if (input.country !== undefined)
      body.country = input.country ? input.country.toUpperCase() : null;
    if (input.timezone !== undefined) body.timezone = input.timezone || null;
    if (input.languages?.length) body.languages = input.languages;
    if (input.lookingFor !== undefined) body.lookingFor = m.lookingForToApi(input.lookingFor);
    if (input.availability !== undefined)
      body.availability = {
        now: input.availability.status === 'now',
        mission: input.availability.forMission,
      };
    if (input.canHelpWith !== undefined) body.canHelpTagSlugs = input.canHelpWith.slice(0, 5);
    if (input.wantsToLearn !== undefined) body.wantLearnTagSlugs = input.wantsToLearn.slice(0, 5);
    if (input.emailNotifications !== undefined) body.emailNotifications = input.emailNotifications;
    if (input.privacy !== undefined) body.privacy = input.privacy;
    if (Object.keys(body).length > 0) await call('PATCH', '/me', body);
    if (input.codeOfConductAcceptedAt) await post('/me/code-of-conduct');
    return sessionOrThrow();
  },
  deleteMe: async (confirmHandle) => {
    const body: DeleteMeRequest = { confirmHandle };
    try {
      await call('DELETE', '/me', body);
    } finally {
      await clearApiReadCache();
    }
  },
  setMySkills: async (slugs) => {
    await call('PATCH', '/me', { canHelpTagSlugs: slugs.slice(0, 5) });
  },

  listTags: async () => (await get<ListTagsResponse>('/tags')).data.map(m.tag),

  getHome: async () => {
    const me = await session();
    const [open, unanswered, mine, rooms] = await Promise.all([
      get<ListQuestionsResponse>('/questions', { status: 'open', forMe: true, limit: 10 }),
      get<ListQuestionsResponse>('/questions', {
        ...QUESTION_TAB.unanswered,
        forMe: true,
        limit: 5,
      }),
      me ? get<ListQuestionsResponse>('/questions', { mine: true, limit: 10 }) : null,
      get<ListRoomsResponse>('/rooms', { limit: 6 }),
    ]);
    return {
      openInMyStacks: open.data.map(m.questionItem),
      unanswered: unanswered.data.map(m.questionItem),
      myQuestions: mine?.data.map(m.questionItem) ?? [],
      recommendedRooms: rooms.data.map(m.roomItem),
      myTasks: [],
      devsToMeet: [],
      activity: [],
    };
  },
  getLanding: async () => ({
    stats: m.impact(await get<ImpactResponse>('/impact')),
    live: [],
    featured: [],
  }),

  listQuestions: async (tab, opts = {}) =>
    (
      await get<ListQuestionsResponse>('/questions', {
        ...QUESTION_TAB[tab],
        tag: opts.tag,
        q: search(opts.q),
        limit: 50,
      })
    ).data.map(m.questionItem),
  getQuestion: async (id) => {
    const q = m.questionDetail(await get<ApiQuestionDetail>(`/questions/${id}`));
    // S7 : un échec de la recherche ne doit jamais empêcher d'afficher la fiche.
    const related = await similar(q.title, id).catch(() => []);
    // S5 : les créneaux ne concernent que l'aidant et l'auteur ; sans session, il n'y en a aucun.
    const pairs = await get<ListPairSessionsResponse>(`/questions/${id}/pair-sessions`)
      .then((r) => r.data.map(m.pairSession))
      .catch(() => []);
    return { ...q, similar: related, pairSessions: pairs };
  },
  similarQuestions: (text) => similar(text),
  createQuestion: async (input, clientId) => {
    const res = await post<AskQuestionResponse>(
      '/questions',
      m.askQuestion(input, clientId, uiLang()),
      clientId,
    );
    return {
      id: res.id,
      authorId: res.author.handle,
      title: input.title,
      body: m.questionBody(input),
      codeSnippet: input.codeSnippet,
      codeLang: input.codeLang,
      urgency: input.urgency,
      lang: uiLang(),
      tagIds: input.tagIds,
      status: 'open',
      aiHint: null,
      aiStatus: 'pending',
      aiHintSource: null,
      acceptedAnswerId: null,
      clientId,
      createdAt: res.createdAt,
      resolvedAt: null,
    };
  },
  answer: async (questionId, body, clientId) => {
    const a = await post<PostAnswerResponse>(
      `/questions/${questionId}/answers`,
      { clientId, body },
      clientId,
    );
    return { ...m.answer(questionId, a), clientId };
  },
  editQuestion: async (questionId, text, baseVersion, clientId) => {
    const r = await call<UpdateQuestionResponse>(
      'PATCH',
      `/questions/${questionId}`,
      { title: text.title, body: text.body, codeSnippet: text.codeSnippet || null, baseVersion },
      clientId,
    );
    return { title: r.title, body: r.body, codeSnippet: r.codeSnippet ?? '', version: r.version };
  },
  editAnswer: async (answerId, body, baseVersion, clientId) => {
    const r = await call<UpdateAnswerResponse>(
      'PATCH',
      `/answers/${answerId}`,
      { body, baseVersion },
      clientId,
    );
    return { body: r.body, version: r.version };
  },
  vote: async (answerId) => {
    await post(`/answers/${answerId}/vote`);
  },
  accept: async (answerId) => {
    const r = await post<AcceptAnswerResponse>(`/answers/${answerId}/accept`);
    return {
      gained: r.xp.granted.reduce((s, g) => s + g.points, 0),
      capped: r.xp.withheld.some((w) => w.reason === 'daily_cap'),
    };
  },
  claim: async (questionId) => {
    await post(`/questions/${questionId}/claim`);
  },
  proposePair: async (questionId, startsAt, videoLink) =>
    m.pairSession(
      await post<PairSessionView>(`/questions/${questionId}/pair`, { startsAt, videoLink }),
    ),
  respondPair: async (pairId, accept) =>
    m.pairSession(await post<PairSessionView>(`/pair-sessions/${pairId}/respond`, { accept })),
  translate: async (target, to) => {
    const t = await post<TranslationResponse>(
      `/${target.type === 'question' ? 'questions' : 'answers'}/${target.id}/translate?lang=${to}`,
    );
    return { title: t.title, body: t.body, demo: t.demo };
  },

  listRooms: async (opts = {}) =>
    (
      await get<ListRoomsResponse>('/rooms', {
        tag: opts.tag,
        q: search(opts.q),
        mine: opts.mine || undefined,
        limit: 50,
      })
    ).data.map(m.roomItem),
  getRoom: room,
  // Le dépôt est vérifié par l'API à la création (droits d'écriture compris, BUG-017).
  verifyRepo: async (fullName) => ({ ok: /^[\w-]+\/[\w.-]+$/.test(fullName) }),
  createRoom: async (input) => {
    const description = input.tagline?.trim()
      ? `${input.tagline.trim()}\n\n${input.description.trim()}`
      : input.description.trim();
    const r = await post<ApiRoomDetail>('/rooms', {
      name: input.name,
      description,
      state: m.roomStateToApi(input.state),
      repoFullName: input.repoFullName || null,
      demoUrl: input.demoUrl || null,
      stackTagSlugs: input.tagIds,
    });
    return m.roomItem(r);
  },
  requestJoin: async (roomId, message) => {
    const r = await post<JoinRoomResponse>(`/rooms/${roomId}/join`, { message: message || null });
    const me = await sessionOrThrow();
    return {
      id: r.id,
      roomId: r.roomId,
      userId: me.id,
      message,
      status: r.status === 'refused' || r.status === 'cancelled' ? 'declined' : r.status,
      createdAt: new Date().toISOString(),
    };
  },
  respondJoin: async (requestId, accept) => {
    const r = await post<JoinRoomResponse & { decidedAt: string }>(
      `/join-requests/${requestId}/decide`,
      {
        decision: accept ? 'accept' : 'refuse',
      },
    );
    return {
      id: r.id,
      roomId: r.roomId,
      userId: '',
      message: '',
      status: r.status === 'accepted' ? 'accepted' : 'declined',
      createdAt: r.decidedAt,
    };
  },
  suggestTasks: async (roomId) => {
    const r = await post<SuggestTasksResponse>(`/rooms/${roomId}/tasks/suggest`, {
      lang: uiLang(),
    });
    return { status: r.status, tasks: r.data.map(m.suggestedTask) };
  },
  createTask: async (roomId, input) =>
    m.task(
      await post<TaskView>(`/rooms/${roomId}/tasks`, {
        title: input.title,
        description: input.description || null,
        level: m.levelToApi(input.level),
      }),
    ),
  takeTask: async (taskId) => m.task(await post<TaskView>(`/tasks/${taskId}/take`)),
  // R8 : « en revue » exige le lien de la PR (completeTask) ; on ne rend pas une tâche prise.
  moveTask: async (taskId, status) => {
    if (status === 'taken') return m.task(await post<TaskView>(`/tasks/${taskId}/take`));
    throw new DomainError(status === 'review' ? 'task.pr_required' : 'feature.unavailable');
  },
  // L'assigné soumet sa PR ; le créateur de la salle clôture (avec ou sans lien).
  completeTask: async (taskId, prUrl) => {
    const me = await sessionOrThrow();
    const current = await call<TaskView>('POST', `/tasks/${taskId}/submit`, { prUrl }).catch(
      (e: unknown) => {
        if (
          e instanceof DomainError &&
          (e.code === 'forbidden' || e.code === 'task.invalid_status')
        )
          return null;
        throw e;
      },
    );
    if (current && current.assignee?.handle === me.id) {
      // Soumise par l'assigné : la clôture revient au créateur, qui est notifié.
      return { task: m.task(current), gained: 0, verified: null };
    }
    const r = await post<CompleteTaskResponse>(`/tasks/${taskId}/complete`, { prUrl });
    return {
      task: m.task(r.task),
      gained: r.points,
      verified: r.task.verification === null ? null : r.task.verification === 'github_verified',
    };
  },
  postMessage: async (roomId, body, kind, clientId) =>
    m.message(
      await post<MessageView>(
        `/rooms/${roomId}/messages`,
        { clientId, body, kind: kind === 'standup' ? 'standup' : 'text' },
        clientId,
      ),
    ),
  requestFeedback: async (roomId, kind, input = {}) =>
    m.feedbackRequest(
      await post<FeedbackRequestView>(`/rooms/${roomId}/feedback-requests`, {
        kind: kind === 'code-review' ? 'code_review' : 'feedback',
        url: input.url?.trim() || null,
        note: input.note?.trim() || null,
      }),
    ),
  listFeedbackRequests: async (opts = {}) =>
    (
      await get<ListFeedbackRequestsResponse>('/feedback-requests', {
        tags: opts.tags?.length ? opts.tags.join(',') : undefined,
        limit: 50,
      })
    ).data.map(m.feedbackRequest),
  takeFeedback: async (id) =>
    m.feedbackRequest(await post<FeedbackRequestView>(`/feedback-requests/${id}/take`)),
  confirmFeedback: async (id) => {
    const r = await post<ConfirmFeedbackResponse>(`/feedback-requests/${id}/confirm`);
    return { request: m.feedbackRequest(r.request), points: r.points };
  },
  cancelFeedback: async (id) =>
    m.feedbackRequest(await post<FeedbackRequestView>(`/feedback-requests/${id}/cancel`)),
  getDeployment: (roomId) =>
    get<DeploymentChallenge>(`/rooms/${roomId}/deployment`).catch((e: unknown) => {
      if (e instanceof DomainError && e.code === 'not_found') return null;
      throw e;
    }),
  setDeployment: (roomId, url) =>
    call<DeploymentChallenge>('PUT', `/rooms/${roomId}/deployment`, { url }),
  verifyDeployment: (roomId) =>
    post<VerifyDeploymentResponse>(`/rooms/${roomId}/deployment/verify`),

  discoverDevs: async (f) => {
    const offset = Math.round(-new Date().getTimezoneOffset() / 60);
    const res = await get<DiscoverDevsResponse>('/discover/devs', {
      tag: f.tags?.[0],
      country: f.country ? f.country.toUpperCase() : undefined,
      tz: f.timezone === 'near' ? offset : undefined,
      available: f.availability === 'now' ? true : undefined,
      mission: f.availability === 'mission' ? true : undefined,
      lookingFor: f.lookingFor,
      limit: 50,
    });
    const cards = res.data.map(m.devCard);
    const q = f.q?.trim().toLowerCase();
    return q
      ? cards.filter(
          (c) => c.handle.toLowerCase().includes(q) || c.displayName.toLowerCase().includes(q),
        )
      : cards;
  },
  leaderboard: async () => m.leaderboard(await get<LeaderboardResponse>('/leaderboard')),
  leaderboardMap: async () =>
    m.leaderboardMap(await get<LeaderboardMapResponse>('/leaderboard/map')),
  getPassport: async (handle) => {
    const [p, proofs] = await Promise.all([
      get<PassportResponse>(`/u/${encodeURIComponent(handle)}`),
      get<ProofsResponse>(`/u/${encodeURIComponent(handle)}/proofs`, { limit: 50 }).catch(
        () => null,
      ),
    ]);
    return m.passport(p, proofs);
  },

  contactDev: async (handle, message) => {
    await post(`/u/${encodeURIComponent(handle)}/contact`, { message });
  },

  listNotifications: async () => {
    const me = await session();
    if (!me) return [];
    const r = await get<ListNotificationsResponse>('/notifications', { limit: 50 });
    return r.data.map((n) => m.notification(n, me.id));
  },
  markNotificationsRead: async () => {
    await post('/notifications/read', { all: true });
  },

  report: async (targetType, targetId, _label, reason) => {
    await post('/reports', { targetType: m.reportTypeToApi(targetType), targetId, reason });
  },
  listReports: async () =>
    (await get<ListReportsResponse>('/admin/reports', { limit: 50 })).data.map(m.report),
  listAudit: async (cursor) =>
    m.auditPage(await get<ListAuditResponse>('/admin/audit', { cursor, limit: 20 })),
  handleReport: async (id, remove) => {
    await post(`/admin/reports/${id}/action`, {
      action: remove ? 'hide' : 'dismiss',
      reason: remove ? 'Retiré par la modération' : 'Signalement rejeté',
    });
  },

  sync: async (items) => {
    const res = await post<SyncResponse>('/sync', {
      actions: items.map((i) => m.syncAction(i.opId, i.action, uiLang())),
    });
    return res.results.map(m.syncOutcome);
  },

  getStatus: async () => m.status(await get<StatusResponse>('/status')),
  getStatusHistory: async (days) =>
    m.statusHistory(await get<StatusHistoryResponse>('/status/history', { days })),
  getImpact: async () => m.impact(await get<ImpactResponse>('/impact')),
  getEcosystem: () => get<SystalinkEcosystemResponse>('/systalink/ecosystem'),
};
