/**
 * Conversions entre les formes de l'API réelle (@devhub/contracts) et les types du front.
 * Fonctions pures, testées (http-mappers.spec.ts).
 *
 * Conventions du mode « http » :
 * - un utilisateur est identifié par son handle : l'API n'expose jamais l'UUID des autres comptes,
 *   et les pages comparent `me.id` à `authorId`, `assigneeId`, `helperId`… qui sont donc des handles ;
 * - une étiquette est identifiée par son slug (l'API reçoit des `tagSlugs`).
 */
import type {
  ReportTargetType,
  AnswerView as ApiAnswer,
  DevCard as ApiDevCard,
  FeedbackRequestView,
  ImpactResponse,
  JoinRequestView,
  LeaderboardMapResponse,
  LeaderboardResponse,
  MatchedHelper,
  MeResponse,
  MessageView,
  NotificationView,
  PairSessionView,
  PassportResponse,
  ProofsResponse,
  PublicAuthor,
  QuestionDetail as ApiQuestionDetail,
  QuestionSummary,
  RoomDetail as ApiRoomDetail,
  RoomSummary,
  StatusHistoryResponse,
  StatusResponse,
  SyncAction,
  SyncResult,
  SuggestedTask,
  TaskView,
  XpRulesResponse,
} from '@devhub/contracts';
import type {
  AIStatus,
  AnswerView,
  AppNotification,
  Availability,
  DevCard,
  FeedbackRequestItem,
  ImpactStats,
  JoinRequest,
  CountryMapStats,
  LeaderboardRow,
  LookingFor,
  MatchReason,
  MatchView,
  NewQuestionInput,
  NewTaskInput,
  XpRuleRow,
  XpRules,
  OfflineAction,
  NotificationType,
  PairSession,
  Passport,
  QuestionDetail,
  QuestionListItem,
  Report,
  RoomDetail,
  RoomListItem,
  RoomMessage,
  RoomState,
  ServerText,
  ServiceStatus,
  SkillView,
  SyncOutcome,
  StatusHistory,
  SystemStatus,
  Tag,
  Task,
  TaskLevel,
  TaskStatus,
  User,
  UserSummary,
  ActivityItem,
  XPEvent,
  XPKind,
} from './types';
import { isReproUrl } from '@/lib/repro';
import { STATIC_XP_RULES } from '@/lib/rules';

type ApiTag = { slug: string; label: string };
type ApiRoomState = RoomSummary['state'];
type ApiTaskLevel = TaskView['level'];

export const tag = (t: ApiTag): Tag => ({ id: t.slug, slug: t.slug, label: t.label });

export const summary = (
  a: PublicAuthor & { country?: string | null; totalXp?: number },
  founder = false,
): UserSummary => ({
  id: a.handle,
  handle: a.handle,
  displayName: a.displayName,
  avatarUrl: a.avatarUrl,
  country: a.country ?? '',
  city: '',
  isDemo: a.isDemo,
  isFounder: founder,
  totalXp: a.totalXp ?? 0,
});

/** Décalage UTC en heures d'un fuseau IANA, à l'instant donné (0 si inconnu). */
export function utcOffset(timezone: string | null | undefined, at = new Date()): number {
  if (!timezone) return 0;
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part ?? '');
    if (!m) return 0;
    const value = Number(m[2]) + Number(m[3] ?? 0) / 60;
    return m[1] === '-' ? -value : value;
  } catch {
    return 0;
  }
}

const LOOKING_FOR: readonly LookingFor[] = ['help', 'helping', 'project', 'team'];

/** L'API stocke « Je cherche » en texte libre ; le front y range ses choix séparés par des virgules. */
export const lookingForFromApi = (v: string | null): LookingFor[] =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is LookingFor => (LOOKING_FOR as readonly string[]).includes(s));

export const lookingForToApi = (v: LookingFor[]): string | null => (v.length ? v.join(',') : null);

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const availabilityFromApi = (
  a: PassportResponse['user']['availability'] | null | undefined,
  forMission = false,
): Availability => ({
  status: a?.now ? 'now' : 'busy',
  slots: (a?.slots ?? []).map((s) => `${DAYS[s.day]} ${s.from}-${s.to}`),
  forMission: forMission || a?.mission === true,
});

export function user(me: MeResponse, passport?: PassportResponse | null): User {
  const p = passport?.user;
  return {
    id: me.handle,
    githubId: 0,
    handle: me.handle,
    displayName: me.displayName,
    avatarUrl: me.avatarUrl,
    country: me.country ?? '',
    city: '',
    timezone: me.timezone ?? 'UTC',
    utcOffset: utcOffset(me.timezone),
    languages: me.languages,
    availability: availabilityFromApi(p?.availability),
    lookingFor: lookingForFromApi(me.lookingFor),
    canHelpWith: (passport?.canHelp ?? []).map((t) => t.slug),
    wantsToLearn: (passport?.wantLearn ?? []).map((t) => t.slug),
    bio: me.bio ?? '',
    lastSeenAt: me.createdAt,
    createdAt: me.createdAt,
    githubCreatedAt: me.githubCreatedAt ?? me.createdAt,
    isAdmin: me.isAdmin,
    isDemo: me.isDemo,
    isFounder: me.trust.founder,
    emailVerified: me.emailVerified,
    emailNotifications: me.emailNotifications,
    hasEmail: me.email !== null,
    privacy: me.privacy,
    codeOfConductAcceptedAt: me.codeOfConductAcceptedAt ?? undefined,
  };
}

const AI_STATUS: Record<ApiQuestionDetail['aiStatus'], AIStatus> = {
  pending: 'pending',
  done: 'ready',
  failed: 'failed',
  skipped: 'failed',
};

export function questionItem(q: QuestionSummary): QuestionListItem {
  return {
    id: q.id,
    authorId: q.author.handle,
    title: q.title,
    body: '',
    codeSnippet: '',
    codeLang: '',
    urgency: q.urgency,
    lang: q.lang,
    tagIds: q.tags.map((t) => t.slug),
    // Une question close sans réponse validée reste affichée comme non résolue.
    status: q.status === 'resolved' ? 'resolved' : 'open',
    aiHint: null,
    aiStatus: 'pending',
    aiHintSource: null,
    acceptedAnswerId: null,
    clientId: q.id,
    createdAt: q.createdAt,
    resolvedAt: q.resolvedAt,
    author: summary(q.author),
    answerCount: q.answerCount,
    tags: q.tags.map(tag),
    claimedBy: null,
  };
}

const REASON: Record<string, { kind: MatchReason['kind']; key: string }> = {
  solved_similar: { kind: 'experience', key: 'match.reason.solved' },
  github_repos: { kind: 'stack', key: 'match.reason.repos' },
  can_help: { kind: 'can-help', key: 'match.reason.canHelp' },
  same_timezone: { kind: 'timezone', key: 'match.reason.timezone' },
  available_now: { kind: 'availability', key: 'match.reason.available' },
  translated: { kind: 'language', key: 'match.reason.translated' },
};

export function matchReason(r: { code: string; params: Record<string, unknown> }): MatchReason {
  const known = REASON[r.code] ?? { kind: 'stack' as const, key: 'match.reason.stack' };
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(r.params)) {
    if (typeof v === 'number' || typeof v === 'string') params[k] = v;
    else if (Array.isArray(v)) params[k] = v.join(', ');
  }
  // Les libellés d'étiquettes sont déjà résolus côté serveur (`tags` ou `tag`).
  if (params.tags === undefined && params.tag !== undefined) params.tags = params.tag;
  return { ...known, params };
}

export function match(questionId: string, h: MatchedHelper): MatchView {
  return {
    id: `${questionId}:${h.wave}:${h.rank}`,
    questionId,
    helperId: h.helper.handle,
    rank: h.rank,
    score: 0,
    reasons: h.reasons.map(matchReason),
    notifiedAt: h.notifiedAt,
    answeredAt: null,
    claimedAt: h.claimedAt,
    helper: summary(h.helper),
  };
}

export const answer = (questionId: string, a: ApiAnswer): AnswerView => ({
  id: a.id,
  questionId,
  authorId: a.author.handle,
  body: a.body,
  isAccepted: a.isAccepted,
  helpfulCount: a.helpfulCount,
  clientId: a.id,
  createdAt: a.createdAt,
  author: summary(a.author),
  votedByMe: false,
  version: a.version,
});

export function questionDetail(q: ApiQuestionDetail): QuestionDetail {
  const matches = q.helpers.map((h) => match(q.id, h));
  const claim = matches.find((m) => m.claimedAt);
  return {
    ...questionItem(q),
    body: q.body,
    codeSnippet: q.codeSnippet ?? '',
    reproUrl: q.reproUrl ?? undefined,
    aiHint: q.aiHint,
    aiStatus: AI_STATUS[q.aiStatus],
    aiHintSource: q.aiStatus === 'done' ? 'ai' : null,
    acceptedAnswerId: q.acceptedAnswerId,
    version: q.version,
    claimedBy: claim ? claim.helper : null,
    answers: q.answers.map((a) => answer(q.id, a)),
    matches,
    pairSessions: [],
    similar: [],
  };
}

/** S5 : les personnes sont désignées par leur handle, comme partout côté front en mode API. */
export const pairSession = (p: PairSessionView): PairSession => ({
  id: p.id,
  questionId: p.questionId,
  hostId: p.host.handle,
  guestId: p.guest.handle,
  startsAt: p.startsAt,
  videoLink: p.videoLink,
  status: p.status,
});

const ROOM_STATE: Record<ApiRoomState, RoomState> = {
  idea: 'idea',
  in_progress: 'building',
  looking_for_help: 'beta',
  shipped: 'live',
};

export const roomStateToApi = (s: RoomState): ApiRoomState =>
  (Object.entries(ROOM_STATE).find(([, v]) => v === s)?.[0] as ApiRoomState) ?? 'in_progress';

export function roomItem(r: RoomSummary): RoomListItem {
  return {
    id: r.id,
    ownerId: r.owner.handle,
    name: r.name,
    tagline: '',
    description: r.description,
    state: ROOM_STATE[r.state],
    repoFullName: r.repo?.fullName ?? '',
    repoVerified: r.repo?.verified ?? false,
    demoUrl: r.demoUrl ?? undefined,
    deployment: r.deployment ?? null,
    coverUrl: null,
    inviteCode: r.code,
    visibility: r.visibility === 'public' ? 'public' : 'private',
    tagIds: r.stack.map((t) => t.slug),
    wantedRoles: [],
    createdAt: r.createdAt,
    lastActivityAt: r.lastActivityAt,
    owner: summary(r.owner),
    tags: r.stack.map(tag),
    memberCount: r.memberCount,
    openTasks: r.openTaskCount,
    members: [],
  };
}

const LEVEL: Record<ApiTaskLevel, TaskLevel> = {
  first_step: 'starter',
  easy: 'starter',
  medium: 'intermediate',
  hard: 'advanced',
};

/** R5 : proposition de l'IA, au format du formulaire de création de tâche. */
export const suggestedTask = (s: SuggestedTask): NewTaskInput => ({
  title: s.title,
  description: s.description ?? '',
  level: LEVEL[s.level],
});

export const levelToApi = (l: TaskLevel): ApiTaskLevel =>
  l === 'starter' ? 'first_step' : l === 'advanced' ? 'hard' : 'medium';

const TASK_STATUS: Record<TaskView['status'], TaskStatus> = {
  open: 'open',
  taken: 'taken',
  in_review: 'review',
  done: 'done',
};

export function task(t: TaskView): Task & { assignee: UserSummary | null } {
  return {
    id: t.id,
    roomId: t.roomId,
    title: t.title,
    description: t.description ?? '',
    level: LEVEL[t.level],
    status: TASK_STATUS[t.status],
    assigneeId: t.assignee?.handle ?? null,
    prUrl: t.prUrl,
    prVerified: t.verification === null ? null : t.verification === 'github_verified',
    githubIssueId: t.fromGithubIssue ? 0 : null,
    createdAt: t.createdAt,
    updatedAt: t.completedAt ?? t.takenAt ?? t.createdAt,
    assignee: t.assignee ? summary(t.assignee) : null,
  };
}

export const message = (m: MessageView): RoomMessage & { author: UserSummary } => ({
  id: m.id,
  roomId: m.roomId,
  authorId: m.author.handle,
  body: m.body,
  kind: m.kind === 'standup' ? 'standup' : 'message',
  clientId: m.clientId,
  createdAt: m.createdAt,
  author: summary(m.author),
});

const JOIN_STATUS: Record<JoinRequestView['status'], JoinRequest['status']> = {
  pending: 'pending',
  accepted: 'accepted',
  refused: 'declined',
  cancelled: 'declined',
};

export const joinRequest = (r: JoinRequestView): JoinRequest & { user: UserSummary } => ({
  id: r.id,
  roomId: r.roomId,
  userId: r.user.handle,
  message: r.message ?? '',
  status: JOIN_STATUS[r.status],
  createdAt: r.createdAt,
  user: summary(r.user),
});

const FEEDBACK_STATUS: Record<FeedbackRequestView['status'], FeedbackRequestItem['status']> = {
  open: 'open',
  in_progress: 'in-progress',
  done: 'done',
  cancelled: 'cancelled',
};

/** R6 : les comptes sont identifiés par leur pseudo côté front (comme `summary`). */
export const feedbackRequest = (f: FeedbackRequestView): FeedbackRequestItem => ({
  id: f.id,
  roomId: f.room.id,
  kind: f.kind === 'code_review' ? 'code-review' : 'feedback',
  status: FEEDBACK_STATUS[f.status],
  url: f.url,
  note: f.note,
  requesterId: f.requester.handle,
  reviewerId: f.reviewer?.handle ?? null,
  createdAt: f.createdAt,
  confirmedAt: f.confirmedAt,
  requester: summary(f.requester),
  reviewer: f.reviewer ? summary(f.reviewer) : null,
  room: f.room,
  tags: f.stack.map(tag),
});

export function roomDetail(
  r: ApiRoomDetail,
  extra: {
    tasks: TaskView[];
    messages: MessageView[];
    requests: JoinRequestView[];
    feedback?: FeedbackRequestView[];
  },
): RoomDetail {
  const role = r.viewer?.role;
  return {
    ...roomItem(r),
    members: r.members.map((m) => summary(m.user)),
    tasks: extra.tasks.map(task),
    // L'API renvoie les plus récents d'abord ; le fil se lit dans l'ordre chronologique.
    messages: extra.messages.map(message).reverse(),
    requests: extra.requests.filter((x) => x.status === 'pending').map(joinRequest),
    myMembership:
      role === 'owner'
        ? 'owner'
        : role
          ? 'member'
          : r.viewer?.joinRequest === 'pending'
            ? 'pending'
            : 'none',
    feedbackRequests: (extra.feedback ?? []).map(feedbackRequest),
  };
}

const NOTIF: Record<NotificationView['type'], NotificationType> = {
  'match.request': 'match',
  'answer.created': 'answer',
  'answer.accepted': 'accepted',
  'join.request': 'join-request',
  'join.decided': 'join-accepted',
  'task.completed': 'task-done',
  'contact.request': 'contact',
  'feedback.requested': 'feedback-requested',
  'feedback.taken': 'feedback-taken',
  'feedback.confirmed': 'feedback-confirmed',
  'feedback.cancelled': 'feedback-cancelled',
  'pair.proposed': 'pair',
  // Remplacé selon la décision (pair-accepted ou pair-declined), voir notification().
  'pair.answered': 'pair-accepted',
};

/** Les libellés du front attendent `author`, `title`, `room`, `task`, `user`, `points`. */
export function notification(n: NotificationView, userId: string): AppNotification {
  const p = n.payload;
  const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? v : '');
  const payload: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(p)) {
    const s = str(v);
    if (s !== '') payload[k] = s;
  }
  if (p.by !== undefined) payload.author = str(p.by);
  if (p.roomName !== undefined) payload.room = str(p.roomName);
  if (p.taskTitle !== undefined) payload.task = str(p.taskTitle);
  if (p.kind === 'code_review') payload.kind = 'code-review';
  // « feedback-confirmed_zero » : un simple retour ne rapporte pas de Proof XP.
  if (n.type === 'feedback.confirmed') payload.count = Number(p.points ?? 0);
  return {
    id: n.id,
    userId,
    type:
      n.type === 'pair.answered'
        ? p.decision === 'accepted'
          ? 'pair-accepted'
          : 'pair-declined'
        : NOTIF[n.type],
    payload,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

const SKILL_LEVEL_TAG = (s: PassportResponse['skills'][number]): SkillView => ({
  userId: '',
  tagId: s.tag.slug,
  githubSignal: s.githubSignal,
  githubRepos: s.githubRepos,
  xpTag: s.platformPoints,
  score: s.score,
  tag: tag(s.tag),
  level: s.level,
});
export const skill = SKILL_LEVEL_TAG;

const XP_KIND: Record<ProofsResponse['events'][number]['kind'], XPKind> = {
  answer_accepted: 'answer-accepted',
  answer_fast_bonus: 'fast-bonus',
  answer_helpful_vote: 'answer-helpful',
  task_completed: 'contribution-accepted',
  code_review_given: 'code-review',
  project_demo_shared: 'project-demo',
  deployment_verified: 'deployment-verified',
  question_resolved: 'question-resolved',
  difficulty_bonus: 'answer-accepted',
  mentoring: 'answer-helpful',
  still_resolved: 'question-resolved',
  revert: 'revert',
};

const SOURCE_TYPES = ['question', 'answer', 'task', 'room', 'xp_event'] as const;

export function proof(handle: string, e: ProofsResponse['events'][number]): XPEvent {
  const sourceType = (SOURCE_TYPES as readonly string[]).includes(e.source.type)
    ? (e.source.type as XPEvent['sourceType'])
    : 'xp_event';
  return {
    id: e.id,
    userId: handle,
    kind: XP_KIND[e.kind],
    points: e.points,
    tagId: e.tag?.slug ?? null,
    sourceType,
    sourceId: e.source.id,
    sourceLabel: e.tag?.label ?? '',
    revertedAt: e.revertedAt,
    createdAt: e.createdAt,
  };
}

export function passport(p: PassportResponse, proofs: ProofsResponse | null): Passport {
  const events = proofs?.events ?? [];
  const perDay = new Map<string, number>();
  for (const e of events)
    perDay.set(e.createdAt.slice(0, 10), (perDay.get(e.createdAt.slice(0, 10)) ?? 0) + 1);
  const u = p.user;
  return {
    user: {
      id: u.handle,
      githubId: 0,
      handle: u.handle,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      country: u.country ?? '',
      city: '',
      timezone: u.timezone ?? '',
      utcOffset: utcOffset(u.timezone),
      languages: u.languages,
      availability: availabilityFromApi(u.availability),
      lookingFor: lookingForFromApi(u.lookingFor),
      canHelpWith: p.canHelp.map((t) => t.slug),
      wantsToLearn: p.wantLearn.map((t) => t.slug),
      bio: u.bio ?? '',
      lastSeenAt: u.memberSince,
      createdAt: u.memberSince,
      githubCreatedAt: u.memberSince,
      isAdmin: false,
      isDemo: u.isDemo,
      isFounder: p.trust.founder,
      emailVerified: p.trust.emailVerified,
    },
    totalXp: p.stats?.totalXp ?? proofs?.totalXp ?? 0,
    skills: p.skills.map(skill),
    stats: {
      questionsResolved: p.stats?.questionsResolved ?? 0,
      answersAccepted: p.stats?.answersAccepted ?? 0,
      medianResponseMinutes: p.stats?.medianMinutesToHelp ?? null,
      contributions: p.stats?.contributions ?? 0,
      reviews: p.stats?.reviews ?? 0,
      devsUnblocked: p.stats?.answersAccepted ?? 0,
    },
    rooms: p.projects.map((r) => ({
      ...roomItem({
        id: r.code,
        code: r.code,
        name: r.name,
        description: '',
        state: r.state,
        visibility: 'public',
        stack: [],
        repo: r.repoFullName ? { fullName: r.repoFullName, url: '', verified: true } : null,
        demoUrl: null,
        deployment: null,
        owner: {
          handle: u.handle,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isDemo: u.isDemo,
        },
        memberCount: 0,
        openTaskCount: 0,
        createdAt: u.memberSince,
        lastActivityAt: u.memberSince,
      }),
      ownerId: r.role === 'owner' ? u.handle : '',
    })),
    proofs: events.map((e) => proof(u.handle, e)),
    heatmap: [...perDay].map(([date, count]) => ({ date, count })),
    countryRank: null,
    accountId: p.user.id,
  };
}

export function devCard(d: ApiDevCard): DevCard {
  return {
    ...summary(d),
    topSkills: d.topSkills.map((s) => ({
      userId: d.handle,
      tagId: s.slug,
      githubSignal: 0,
      githubRepos: 0,
      xpTag: 0,
      score: s.score,
      tag: tag(s),
      level:
        s.score >= 80
          ? 'expert'
          : s.score >= 50
            ? 'advanced'
            : s.score >= 20
              ? 'confirmed'
              : 'beginner',
    })),
    availability: {
      status: d.availableNow ? 'now' : 'busy',
      slots: [],
      forMission: d.availableForMission,
    },
    languages: [],
    utcOffset: utcOffset(d.timezone),
    lookingFor: lookingForFromApi(d.lookingFor),
  };
}

/**
 * T1 : flux « en direct » de la page publique, tiré des questions publiques récentes.
 * Les comptes de démonstration en sont exclus, comme des chiffres d'impact (CDC v3.1, T2).
 */
export function landingActivity(questions: QuestionSummary[], max = 8): ActivityItem[] {
  const items: ActivityItem[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    if (q.author.isDemo || seen.has(q.id)) continue;
    seen.add(q.id);
    const base = { actor: summary(q.author), targetLabel: q.title, targetHref: `/sos/${q.id}` };
    items.push({ ...base, id: `ask-${q.id}`, kind: 'asked', createdAt: q.createdAt });
    if (q.status === 'resolved' && q.resolvedAt)
      items.push({
        ...base,
        id: `res-${q.id}`,
        kind: 'resolved',
        detail: String(
          Math.max(1, Math.round((Date.parse(q.resolvedAt) - Date.parse(q.createdAt)) / 60_000)),
        ),
        createdAt: q.resolvedAt,
      });
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, max);
}

/** T1 : les trois devs les mieux classés, hors comptes de démonstration. */
export const featuredDevs = (r: LeaderboardResponse, max = 3): UserSummary[] =>
  r.devs
    .filter((d) => !d.isDemo)
    .slice(0, max)
    .map((d) => summary({ ...d, avatarUrl: null, country: d.country, totalXp: d.totalXp }));

export const leaderboardMap = (r: LeaderboardMapResponse): CountryMapStats => ({
  source: 'live',
  activeWindowDays: r.activeWindowDays,
  method: r.method,
  countries: r.countries.map((c) => ({
    country: c.country,
    devs: c.devs,
    activeDevs: c.activeDevs,
    unblocked: c.questionsUnblocked,
    xp: c.totalXp,
  })),
  unlocatedDevs: r.unlocated.devs,
  demo: { devs: r.demo.devs, xp: r.demo.totalXp },
});

export const leaderboard = (r: LeaderboardResponse): LeaderboardRow[] =>
  r.countries.map((c) => ({
    country: c.country,
    devs: c.devs,
    xp: c.totalXp,
    resolved: 0,
    topDev: null,
  }));

const SERVICE_NAME: Record<StatusResponse['services'][number]['service'], string> = {
  vps: 'VPS',
  database: 'Base de données',
  backup: 'Sauvegarde cloud',
  mail: 'Messagerie pro',
};

const SERVICE_STATE: Record<StatusResponse['services'][number]['state'], ServiceStatus['status']> =
  {
    operational: 'up',
    down: 'down',
    not_configured: 'pending',
    unknown: 'pending',
  };

export const statusHistory = (h: StatusHistoryResponse): StatusHistory => ({
  days: h.days,
  services: h.services.map((x) => ({
    id: x.service,
    name: SERVICE_NAME[x.service],
    uptimePercent: x.uptimePercent,
    checks: x.checks,
    daily: x.daily,
  })),
});

export function status(s: StatusResponse, now = new Date()): SystemStatus {
  return {
    services: s.services.map((x) => ({
      id: x.service,
      name: SERVICE_NAME[x.service],
      product: 'systalink',
      status: SERVICE_STATE[x.state],
      latencyMs: x.latencyMs,
      detail:
        x.state === 'not_configured'
          ? 'non branché'
          : x.state === 'unknown'
            ? 'pas de sonde récente'
            : x.state,
      checkedAt: x.checkedAt ?? now.toISOString(),
    })),
    lastBackupAt: s.lastBackupAt,
    region: 'Systalink',
    source: 'live',
  };
}

export const impact = (i: ImpactResponse): ImpactStats => ({
  devs: i.registeredDevs,
  questionsResolved: i.questionsResolved,
  medianFirstResponseMinutes: i.medianFirstResponseMinutes,
  countries: i.countries,
  verifiedContributions: i.verifiedContributions,
  crossLanguage: i.crossLanguageAnswers,
  // Pas de série hebdomadaire dans l'API : le graphique est masqué plutôt que vide.
  weekly: [],
  source: 'live',
});

export const reportTypeToApi = (t: Report['targetType']): ReportTargetType =>
  t === 'message' ? 'room_message' : t;

/** S7 : au plus trois questions similaires, avant de publier comme sur une fiche. */
export const SIMILAR_LIMIT = 3;

/**
 * S7 : requête « l'un des mots » pour la recherche plein texte (`websearch_to_tsquery`).
 * Un titre entier exigerait tous ses mots à la fois ; on garde les mots d'au moins 4 signes,
 * sans doublon, reliés par « or ». Rien d'exploitable : `undefined`.
 */
export function similarSearch(text: string): string | undefined {
  const words = text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_.+#-]{3,}/gu) ?? [];
  const unique = [...new Set(words)].slice(0, 8);
  return unique.length ? unique.join(' or ') : undefined;
}

/** Gabarit guidé (S8) : les rubriques facultatives rejoignent le corps de la question. */
export function questionBody(i: NewQuestionInput): string {
  const parts = [i.body.trim()];
  if (i.tried?.trim()) parts.push(`**Ce que j'ai essayé**\n\n${i.tried.trim()}`);
  if (i.expected?.trim()) parts.push(`**Ce que j'attendais**\n\n${i.expected.trim()}`);
  if (i.environment?.trim()) parts.push(`**Environnement**\n\n${i.environment.trim()}`);
  // S14 : un lien hors liste blanche (action mise en file avant la validation) reste dans le corps.
  const repro = i.reproUrl?.trim();
  if (repro && !isReproUrl(repro)) parts.push(`Reproduction : ${repro}`);
  return parts.join('\n\n');
}

/** Corps de POST /questions : le même en direct et dans /sync (même empreinte d'idempotence). */
export const askQuestion = (i: NewQuestionInput, clientId: string, lang: 'fr' | 'en') => ({
  clientId,
  title: i.title,
  body: questionBody(i),
  codeSnippet: i.codeSnippet || null,
  reproUrl: i.reproUrl?.trim() && isReproUrl(i.reproUrl.trim()) ? i.reproUrl.trim() : null,
  tagSlugs: i.tagIds,
  urgency: i.urgency,
  lang,
});

/** Action de la file hors ligne → action de POST /sync. L'opId est le clientId de l'action. */
export function syncAction(opId: string, a: OfflineAction, lang: 'fr' | 'en'): SyncAction {
  switch (a.type) {
    case 'question':
      return { opId, type: 'question.create', payload: askQuestion(a.payload, opId, lang) };
    case 'answer':
      return {
        opId,
        type: 'answer.create',
        payload: { questionId: a.payload.questionId, clientId: opId, body: a.payload.body },
      };
    case 'message':
      return {
        opId,
        type: 'room_message.create',
        payload: {
          roomId: a.payload.roomId,
          clientId: opId,
          body: a.payload.body,
          kind: a.payload.kind === 'standup' ? 'standup' : 'text',
        },
      };
    case 'take-task':
      return { opId, type: 'task.take', payload: { taskId: a.payload.taskId } };
    case 'edit-question': {
      const { questionId, title, body, codeSnippet, baseVersion } = a.payload;
      return {
        opId,
        type: 'question.update',
        payload: { questionId, title, body, codeSnippet: codeSnippet || null },
        baseVersion,
      };
    }
    case 'edit-answer':
      return {
        opId,
        type: 'answer.update',
        payload: { answerId: a.payload.answerId, body: a.payload.body },
        baseVersion: a.payload.baseVersion,
      };
  }
}

/**
 * O4 : le texte en ligne joint à un 409 version_conflict (`server` du problem+json, ou
 * `data.server` d'un résultat de /sync). Une question a un titre ; une réponse, seulement un corps.
 */
export function serverText(raw: unknown): ServerText | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, unknown>;
  if (typeof s.version !== 'number' || typeof s.body !== 'string') return undefined;
  if (typeof s.title === 'string')
    return {
      kind: 'question',
      version: s.version,
      title: s.title,
      body: s.body,
      codeSnippet: typeof s.codeSnippet === 'string' ? s.codeSnippet : '',
    };
  return { kind: 'answer', version: s.version, body: s.body };
}

export const syncOutcome = (r: SyncResult): SyncOutcome =>
  r.status === 'applied' || r.status === 'duplicate'
    ? { opId: r.opId, outcome: 'done' }
    : r.status === 'skipped'
      ? { opId: r.opId, outcome: 'retry', code: r.error?.code }
      : r.status === 'conflict'
        ? {
            opId: r.opId,
            outcome: 'error',
            code: 'version_conflict',
            server: serverText((r.data as { server?: unknown } | undefined)?.server),
          }
        : { opId: r.opId, outcome: 'error', code: r.error?.code ?? r.status };

/** X5 : genres de Proof XP de l'API → lignes du barème affiché. */
const XP_RULE_ROW: Record<string, XpRuleRow> = {
  answer_accepted: 'accepted',
  answer_fast_bonus: 'fast',
  answer_helpful_vote: 'helpful',
  task_completed: 'contribution',
  code_review_given: 'review',
  project_demo_shared: 'demo',
  question_resolved: 'resolved',
  deployment_verified: 'deployment',
};

/** X5 : barème lu depuis l'API ; une ligne absente garde la valeur de repli. */
export function xpRules(r: XpRulesResponse, fallback: XpRules = STATIC_XP_RULES): XpRules {
  const points = { ...fallback.points };
  for (const [kind, value] of Object.entries(r.points)) {
    const row = XP_RULE_ROW[kind];
    if (row) points[row] = value;
  }
  return {
    points,
    dailyCap: r.limits.dailyCap,
    fastBonusMinutes: r.limits.fastBonusMinutes,
    helpfulVotesPerAnswer: r.limits.helpfulVotesPerAnswer,
    validationsPerPairPerWeek: r.limits.validationsPerPairPerWeek,
    minVoterAccountAgeHours: r.limits.minVoterAccountAgeHours,
    githubPerRepo: r.scoring.githubPerRepo,
    githubCap: r.scoring.githubCap,
    platformCap: r.scoring.platformCap,
    activeMonths: r.scoring.activeMonths,
  };
}
