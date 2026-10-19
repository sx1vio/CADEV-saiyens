/**
 * Types du domaine — calqués sur le modèle de données du cahier des charges v3 (§7)
 * et sur les points d'entrée de l'API (§8). À partager avec le rôle 2 (back-end).
 *
 * Convention : identifiants UUID (string), dates ISO 8601 (string).
 */

export type ID = string;
export type ISODate = string;
export type Lang = 'fr' | 'en';

export interface Tag {
  id: ID;
  slug: string;
  label: string;
}

export type AvailabilityStatus = 'now' | 'today' | 'busy';

export interface Availability {
  status: AvailabilityStatus;
  /** Créneaux habituels, ex. « Lun-Ven 19h-22h » */
  slots: string[];
  /** PR4 : disponible pour une mission */
  forMission: boolean;
}

export type LookingFor = 'help' | 'helping' | 'project' | 'team';

export interface User {
  id: ID;
  githubId: number;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  country: string; // ISO 3166-1 alpha-2
  city: string;
  timezone: string; // IANA, ex. Africa/Abidjan
  utcOffset: number; // en heures, pour le terme F du matching
  languages: Lang[];
  availability: Availability;
  lookingFor: LookingFor[];
  /** PR10 (v3.1) */
  canHelpWith: ID[];
  wantsToLearn: ID[];
  bio: string;
  lastSeenAt: ISODate;
  createdAt: ISODate;
  githubCreatedAt: ISODate;
  isAdmin: boolean;
  /** Comptes de démonstration, marqués « Démo » partout (CDC §6.6) */
  isDemo: boolean;
  /** PR11 : inscrit avant le 22 oct. 2026 */
  isFounder: boolean;
  emailVerified: boolean;
  /** Préférence T3 : pourquoi je viens */
  intent?: 'get-help' | 'help' | 'find-project' | 'start-project';
  codeOfConductAcceptedAt?: ISODate;
  deletedAt?: ISODate | null;
}

/** Ligne de user_skills : score = min(100, G + P) (CDC §6.3) */
export interface UserSkill {
  userId: ID;
  tagId: ID;
  /** G = min(40, 5 × dépôts qualifiés) — X3 */
  githubSignal: number;
  /** Nombre de dépôts qualifiés utilisés pour G */
  githubRepos: number;
  /** P = min(60, Proof XP gagnés sur l'étiquette) */
  xpTag: number;
  score: number;
}

export type SkillLevel = 'beginner' | 'confirmed' | 'advanced' | 'expert';

export type Urgency = 'low' | 'normal' | 'high';
export type QuestionStatus = 'open' | 'resolved';
export type AIStatus = 'pending' | 'waiting-network' | 'ready' | 'failed';

export interface Question {
  id: ID;
  authorId: ID;
  title: string;
  body: string;
  /** S8 (v3.1) : gabarit guidé */
  tried?: string;
  expected?: string;
  environment?: string;
  codeSnippet: string;
  codeLang: string;
  reproUrl?: string; // S14
  urgency: Urgency;
  lang: Lang;
  tagIds: ID[];
  status: QuestionStatus;
  aiHint: string | null;
  aiStatus: AIStatus;
  /** « ai » = généré par l'IA côté serveur ; « rules » = piste locale par motifs d'erreurs connus */
  aiHintSource: 'ai' | 'rules' | null;
  acceptedAnswerId: ID | null;
  roomId?: ID | null;
  clientId: ID;
  createdAt: ISODate;
  resolvedAt: ISODate | null;
  /** Retiré par la modération */
  removedAt?: ISODate | null;
  /** O4 : version du texte, envoyée comme `baseVersion` à la modification (1 par défaut). */
  version?: number;
}

export interface Answer {
  id: ID;
  questionId: ID;
  authorId: ID;
  body: string;
  isAccepted: boolean;
  helpfulCount: number;
  clientId: ID;
  createdAt: ISODate;
  removedAt?: ISODate | null;
  /** O4 : version du texte (1 par défaut). */
  version?: number;
}

/** O4 : texte modifiable d'une question (le titre, l'énoncé, l'extrait de code). */
export interface QuestionText {
  title: string;
  body: string;
  codeSnippet: string;
}

/** O4 : la version d'un texte actuellement en ligne, renvoyée par le serveur en cas de conflit. */
export type ServerText =
  | ({ kind: 'question'; version: number } & QuestionText)
  | { kind: 'answer'; version: number; body: string };

/** Raison lisible d'un matching (« a déjà résolu 5 problèmes Docker ») */
export interface MatchReason {
  kind:
    'experience' | 'stack' | 'timezone' | 'availability' | 'reputation' | 'language' | 'can-help';
  /** clé i18n + paramètres */
  key: string;
  params?: Record<string, string | number>;
}

export interface MatchEvent {
  id: ID;
  questionId: ID;
  helperId: ID;
  rank: number;
  score: number;
  reasons: MatchReason[];
  notifiedAt: ISODate;
  answeredAt: ISODate | null;
  /** S11 (v3.1) « Je m'en occupe » */
  claimedAt: ISODate | null;
}

export interface PairSession {
  id: ID;
  questionId: ID;
  hostId: ID;
  guestId: ID;
  startsAt: ISODate;
  videoLink: string;
  status: 'proposed' | 'accepted' | 'declined' | 'done';
}

export type RoomState = 'idea' | 'building' | 'beta' | 'live';

export interface Room {
  id: ID;
  ownerId: ID;
  name: string;
  tagline: string;
  description: string;
  state: RoomState;
  repoFullName: string;
  repoVerified: boolean;
  demoUrl?: string;
  /** Preuve « en production » (idée A, Systalink) */
  deployment?: RoomDeployment | null;
  /** Bannière de la salle (comme la bannière d'un serveur Discord) */
  coverUrl?: string | null;
  inviteCode: string;
  visibility: 'public' | 'private';
  tagIds: ID[];
  /** R10 (v3.1) — rôles recherchés */
  wantedRoles: string[];
  createdAt: ISODate;
  lastActivityAt: ISODate;
}

/** GET /systalink/ecosystem (idées A et B) */
export interface SystalinkEcosystem {
  referrals: { total: number; last30Days: number; bySource: { source: string; count: number }[] };
  roomsOnSystalink: number;
  showcase: {
    code: string;
    name: string;
    url: string;
    uptime: number | null;
    verifiedAt: ISODate;
  }[];
  computedAt: ISODate;
}

/** Preuve « en production » d'une salle : l'URL sert le jeton de la salle. */
export interface RoomDeployment {
  url: string;
  status: 'pending' | 'verified';
  hostedOnSystalink: boolean;
  verifiedAt: ISODate | null;
  lastCheckAt: ISODate | null;
  lastUp: boolean | null;
  /** 0 à 1, null sans sonde */
  uptime: number | null;
}

/** Réservé au créateur : le jeton à publier dans l'application. */
export interface DeploymentChallenge extends RoomDeployment {
  token: string;
  proofPath: string;
}

export interface RoomMember {
  roomId: ID;
  userId: ID;
  role: 'owner' | 'member';
  joinedAt: ISODate;
}

export interface JoinRequest {
  id: ID;
  roomId: ID;
  userId: ID;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: ISODate;
}

export type TaskLevel = 'starter' | 'intermediate' | 'advanced';
export type TaskStatus = 'open' | 'taken' | 'review' | 'done';

export interface Task {
  id: ID;
  roomId: ID;
  title: string;
  description: string;
  level: TaskLevel;
  status: TaskStatus;
  assigneeId: ID | null;
  prUrl: string | null;
  /** R9 (v3.1) : PR vérifiée par GitHub (fusionnée + bon auteur) */
  prVerified: boolean | null;
  githubIssueId: number | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface RoomMessage {
  id: ID;
  roomId: ID;
  authorId: ID;
  body: string;
  kind: 'message' | 'standup';
  clientId: ID;
  createdAt: ISODate;
}

export interface FeedbackRequest {
  id: ID;
  roomId: ID;
  kind: 'feedback' | 'code-review';
  status: 'open' | 'done';
  createdAt: ISODate;
}

export type XPKind =
  | 'answer-accepted'
  | 'fast-bonus'
  | 'answer-helpful'
  | 'contribution-accepted'
  | 'code-review'
  | 'project-demo'
  | 'question-resolved'
  | 'deployment-verified'
  | 'revert';

/** Journal append-only (CDC §6.3) */
export interface XPEvent {
  id: ID;
  userId: ID;
  kind: XPKind;
  points: number;
  tagId: ID | null;
  /** Toutes les étiquettes créditées (le score P de chacune est augmenté) */
  tagIds?: ID[];
  sourceType: 'question' | 'answer' | 'task' | 'room' | 'xp_event';
  sourceId: ID;
  /** Libellé de la source pour l'affichage (« nginx 502 derrière Docker ») */
  sourceLabel: string;
  /** Lien vers la preuve (calculé à la lecture) */
  sourceHref?: string;
  revertedAt: ISODate | null;
  createdAt: ISODate;
}

export type NotificationType =
  | 'match'
  | 'answer'
  | 'accepted'
  | 'join-request'
  | 'join-accepted'
  | 'task-done'
  | 'claim'
  | 'pair';

export interface AppNotification {
  id: ID;
  userId: ID;
  type: NotificationType;
  payload: Record<string, string | number>;
  readAt: ISODate | null;
  createdAt: ISODate;
}

export interface Report {
  id: ID;
  reporterId: ID;
  targetType: 'question' | 'answer' | 'room' | 'message' | 'user';
  targetId: ID;
  targetLabel: string;
  reason: string;
  status: 'open' | 'removed' | 'dismissed';
  handledBy: ID | null;
  createdAt: ISODate;
}

/** M4 : une décision de modération, dans le journal (append-only) de /admin. */
export interface AuditEntry {
  id: ID;
  action: 'hide' | 'restore' | 'dismiss';
  targetType: Report['targetType'];
  targetId: ID;
  reason: string;
  admin: UserSummary;
  createdAt: ISODate;
}

export interface AuditPage {
  entries: AuditEntry[];
  /** Curseur de la page suivante, `null` à la fin du journal. */
  next: string | null;
}

/* ---------- Vues composées renvoyées par l'API ---------- */

export interface UserSummary {
  id: ID;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  country: string;
  city: string;
  isDemo: boolean;
  isFounder: boolean;
  totalXp: number;
}

export interface QuestionListItem extends Question {
  author: UserSummary;
  answerCount: number;
  tags: Tag[];
  claimedBy?: UserSummary | null;
}

export interface AnswerView extends Answer {
  author: UserSummary;
  votedByMe: boolean;
}

export interface MatchView extends MatchEvent {
  helper: UserSummary;
}

export interface QuestionDetail extends QuestionListItem {
  answers: AnswerView[];
  matches: MatchView[];
  pairSessions: PairSession[];
  similar: QuestionListItem[];
}

export interface SkillView extends UserSkill {
  tag: Tag;
  level: SkillLevel;
}

export interface PassportStats {
  questionsResolved: number;
  answersAccepted: number;
  medianResponseMinutes: number | null;
  contributions: number;
  reviews: number;
  devsUnblocked: number;
}

export interface Passport {
  user: User;
  totalXp: number;
  skills: SkillView[];
  stats: PassportStats;
  rooms: RoomListItem[];
  proofs: XPEvent[];
  /** PR8 : nombre d'événements d'entraide par jour, 26 semaines */
  heatmap: { date: string; count: number }[];
  countryRank: number | null;
  /** Identifiant interne du compte (UUID en mode http) : cible d'un signalement (M1). */
  accountId: ID;
}

export interface RoomListItem extends Room {
  owner: UserSummary;
  tags: Tag[];
  memberCount: number;
  openTasks: number;
  members: UserSummary[];
}

export interface RoomDetail extends RoomListItem {
  tasks: (Task & { assignee: UserSummary | null })[];
  messages: (RoomMessage & { author: UserSummary })[];
  requests: (JoinRequest & { user: UserSummary })[];
  myMembership: 'owner' | 'member' | 'pending' | 'none';
  feedbackRequests: FeedbackRequest[];
}

export interface DiscoverFilters {
  q?: string;
  tags?: ID[];
  country?: string;
  timezone?: 'near' | 'any';
  availability?: AvailabilityStatus | 'mission';
  lookingFor?: LookingFor;
}

export interface DevCard extends UserSummary {
  topSkills: SkillView[];
  availability: Availability;
  languages: Lang[];
  utcOffset: number;
  lookingFor: LookingFor[];
}

export interface LeaderboardRow {
  country: string;
  devs: number;
  xp: number;
  resolved: number;
  topDev: UserSummary | null;
}

export interface ServiceStatus {
  id: 'vps' | 'database' | 'backup' | 'mail' | 'storage' | 'client-db' | 'service-worker';
  name: string;
  product: 'systalink' | 'client';
  status: 'up' | 'degraded' | 'down' | 'pending';
  latencyMs: number | null;
  detail: string;
  checkedAt: ISODate;
}

export interface SystemStatus {
  services: ServiceStatus[];
  lastBackupAt: ISODate | null;
  region: string;
  source: 'live' | 'local';
}

/**
 * Y5 — GET /status/history : disponibilité par service et par jour (UTC). `uptimePercent` vaut
 * null quand aucune sonde utile n'a tourné ce jour-là : « pas de mesure », jamais 100 %.
 */
export interface StatusHistory {
  days: number;
  services: {
    id: ServiceStatus['id'];
    name: string;
    uptimePercent: number | null;
    checks: number;
    daily: { date: string; uptimePercent: number | null; checks: number }[];
  }[];
}

export interface ImpactStats {
  devs: number;
  questionsResolved: number;
  medianFirstResponseMinutes: number | null;
  countries: number;
  verifiedContributions: number;
  crossLanguage: number;
  weekly: { week: string; resolved: number; asked: number }[];
  source: 'live' | 'local';
}

export interface HomeFeed {
  openInMyStacks: QuestionListItem[];
  unanswered: QuestionListItem[];
  myQuestions: QuestionListItem[];
  recommendedRooms: RoomListItem[];
  myTasks: (Task & { room: Pick<Room, 'id' | 'name' | 'inviteCode'> })[];
  devsToMeet: { dev: DevCard; reason: MatchReason }[];
  activity: ActivityItem[];
}

export interface ActivityItem {
  id: ID;
  kind: 'resolved' | 'answered' | 'joined' | 'task-done' | 'room-created' | 'asked';
  actor: UserSummary;
  targetLabel: string;
  targetHref: string;
  detail?: string;
  createdAt: ISODate;
}

export interface PublicLanding {
  stats: ImpactStats;
  live: ActivityItem[];
  featured: Passport[];
}

/* ---------- Entrées ---------- */

export interface NewQuestionInput {
  title: string;
  body: string;
  tried?: string;
  expected?: string;
  environment?: string;
  codeSnippet: string;
  codeLang: string;
  reproUrl?: string;
  urgency: Urgency;
  tagIds: ID[];
  roomId?: ID | null;
}

export interface NewRoomInput {
  coverUrl?: string | null;
  name: string;
  tagline: string;
  description: string;
  state: RoomState;
  repoFullName: string;
  demoUrl?: string;
  tagIds: ID[];
  wantedRoles: string[];
}

export interface NewTaskInput {
  title: string;
  description: string;
  level: TaskLevel;
}

export interface ProfileInput {
  displayName?: string;
  bio?: string;
  country?: string;
  city?: string;
  timezone?: string;
  languages?: Lang[];
  availability?: Availability;
  lookingFor?: LookingFor[];
  canHelpWith?: ID[];
  wantsToLearn?: ID[];
  intent?: User['intent'];
  codeOfConductAcceptedAt?: ISODate;
}

/* ---------- File hors ligne (O2) ---------- */

/** Action rédigée hors ligne, rejouée au retour du réseau. */
export type OfflineAction =
  | { type: 'question'; payload: NewQuestionInput }
  | { type: 'answer'; payload: { questionId: string; body: string; questionTitle: string } }
  | {
      type: 'message';
      payload: { roomId: string; body: string; kind: RoomMessage['kind']; roomName: string };
    }
  | { type: 'take-task'; payload: { taskId: string; taskTitle: string } }
  // O4 : modification d'un texte publié, avec la version que l'auteur avait sous les yeux.
  | {
      type: 'edit-question';
      payload: QuestionText & { questionId: ID; baseVersion: number };
    }
  | {
      type: 'edit-answer';
      payload: {
        answerId: ID;
        questionId: ID;
        questionTitle: string;
        body: string;
        baseVersion: number;
      };
    };

/**
 * Résultat d'une action rejouée par lot (POST /sync) : `done` = appliquée ou déjà appliquée,
 * `retry` = échec passager (réseau, 5xx, 429), `error` = refus définitif ou conflit de version.
 */
export interface SyncOutcome {
  opId: ID;
  outcome: 'done' | 'retry' | 'error';
  code?: string;
  /** Conflit de version (O4) : le texte en ligne, pour l'écran de conflit. */
  server?: ServerText;
}

/** Erreurs métier lisibles (garde-fous X2, etc.) */
export class DomainError extends Error {
  code: string;
  params?: Record<string, string | number>;
  /** 409 version_conflict (O4) : le texte en ligne. */
  server?: ServerText;
  constructor(code: string, params?: Record<string, string | number>, server?: ServerText) {
    super(code);
    this.code = code;
    this.params = params;
    this.server = server;
  }
}
