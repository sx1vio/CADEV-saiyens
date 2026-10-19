/**
 * Contrat d'accès aux données du front.
 * Chaque méthode correspond à un point d'entrée de l'API du CDC (§8), indiqué en commentaire.
 * Deux implémentations : `local` (serveur local IndexedDB) et `http` (vraie API), choisies dans services/index.ts.
 */
import type {
  AppNotification,
  AuditPage,
  DevCard,
  DiscoverFilters,
  HomeFeed,
  ID,
  ImpactStats,
  StatusHistory,
  SystalinkEcosystem,
  JoinRequest,
  LeaderboardRow,
  NewQuestionInput,
  NewRoomInput,
  NewTaskInput,
  PairSession,
  Passport,
  ProfileInput,
  PublicLanding,
  Question,
  QuestionDetail,
  QuestionListItem,
  Report,
  RoomDetail,
  RoomListItem,
  RoomMessage,
  SystemStatus,
  Tag,
  Task,
  TaskStatus,
  User,
  UserSummary,
  Answer,
  DeploymentChallenge,
  RoomDeployment,
  FeedbackRequest,
  OfflineAction,
  QuestionText,
  SyncOutcome,
} from './types';

export type QuestionTab = 'for-me' | 'unanswered' | 'resolved' | 'all' | 'mine';

export interface GitHubImport {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  githubId: number;
  githubCreatedAt: string;
  location: string | null;
  /** slug d'étiquette → dépôts qualifiés (X3) */
  skills: Record<string, number>;
  publicRepos: number;
}

export interface DevHubApi {
  mode: 'local' | 'http';

  /* Auth — GET /auth/github, GET /me, PATCH /me */
  getSession(): Promise<User | null>;
  importGitHub(handle: string): Promise<GitHubImport>;
  signUpWithGitHub(data: GitHubImport): Promise<User>;
  loginDemo(handle?: string): Promise<User>;
  listDemoAccounts(): Promise<UserSummary[]>;
  logout(): Promise<void>;
  updateMe(input: ProfileInput): Promise<User>;
  /** A3 : anonymise le compte ; `confirmHandle` est le pseudo retapé par la personne. */
  deleteMe(confirmHandle: string): Promise<void>;
  setMySkills(slugs: string[]): Promise<void>;

  /* Référentiels */
  listTags(): Promise<Tag[]>;

  /* Accueil et page publique */
  getHome(): Promise<HomeFeed>;
  getLanding(): Promise<PublicLanding>;

  /* SOS Dev — /questions, /answers */
  listQuestions(tab: QuestionTab, opts?: { tag?: string; q?: string }): Promise<QuestionListItem[]>;
  getQuestion(id: ID): Promise<QuestionDetail>;
  similarQuestions(text: string, tagIds: ID[]): Promise<QuestionListItem[]>;
  createQuestion(input: NewQuestionInput, clientId: ID): Promise<Question>;
  answer(questionId: ID, body: string, clientId: ID): Promise<Answer>;
  /**
   * O4 — PATCH /questions/:id et /answers/:id : modifier son texte à partir de `baseVersion`.
   * Si le texte a changé en ligne entre-temps : `DomainError('version_conflict')` avec `server`.
   */
  editQuestion(
    questionId: ID,
    text: QuestionText,
    baseVersion: number,
    clientId: ID,
  ): Promise<QuestionText & { version: number }>;
  editAnswer(
    answerId: ID,
    body: string,
    baseVersion: number,
    clientId: ID,
  ): Promise<{ body: string; version: number }>;
  vote(answerId: ID): Promise<void>;
  accept(answerId: ID): Promise<{ gained: number; capped: boolean }>;
  claim(questionId: ID): Promise<void>;
  proposePair(questionId: ID, startsAt: string, videoLink: string): Promise<PairSession>;
  respondPair(pairId: ID, accept: boolean): Promise<PairSession>;
  translate(text: string, to: 'fr' | 'en'): Promise<string>;

  /* Salles — /rooms, /tasks */
  listRooms(opts?: { tag?: string; q?: string; mine?: boolean }): Promise<RoomListItem[]>;
  getRoom(code: string): Promise<RoomDetail>;
  verifyRepo(
    fullName: string,
  ): Promise<{ ok: boolean; description?: string; language?: string | null; stars?: number }>;
  createRoom(input: NewRoomInput): Promise<RoomListItem>;
  requestJoin(roomId: ID, message: string): Promise<JoinRequest>;
  respondJoin(requestId: ID, accept: boolean): Promise<JoinRequest>;
  createTask(roomId: ID, input: NewTaskInput): Promise<Task>;
  takeTask(taskId: ID): Promise<Task>;
  moveTask(taskId: ID, status: TaskStatus): Promise<Task>;
  completeTask(
    taskId: ID,
    prUrl: string,
  ): Promise<{ task: Task; gained: number; verified: boolean | null }>;
  postMessage(
    roomId: ID,
    body: string,
    kind: RoomMessage['kind'],
    clientId: ID,
  ): Promise<RoomMessage>;
  requestFeedback(roomId: ID, kind: FeedbackRequest['kind']): Promise<FeedbackRequest>;
  /** Idée A (Systalink) : preuve « en production », réservée au créateur et aux mainteneurs. */
  getDeployment(roomId: ID): Promise<DeploymentChallenge | null>;
  setDeployment(roomId: ID, url: string): Promise<DeploymentChallenge>;
  verifyDeployment(roomId: ID): Promise<{ deployment: RoomDeployment; xpAwarded: boolean }>;

  /* Découverte — /discover, /leaderboard, /u/:handle */
  discoverDevs(filters: DiscoverFilters): Promise<DevCard[]>;
  leaderboard(): Promise<LeaderboardRow[]>;
  getPassport(handle: string): Promise<Passport>;
  /** PR4 — POST /u/:handle/contact : message relayé par notification puis par e-mail (Y3). */
  contactDev(handle: string, message: string): Promise<void>;

  /* Notifications */
  listNotifications(): Promise<AppNotification[]>;
  markNotificationsRead(): Promise<void>;

  /* Modération — /reports, /admin/reports */
  report(
    targetType: Report['targetType'],
    targetId: ID,
    targetLabel: string,
    reason: string,
  ): Promise<void>;
  listReports(): Promise<(Report & { reporter: UserSummary })[]>;
  handleReport(id: ID, remove: boolean): Promise<void>;
  /** M4 — GET /admin/audit : journal des décisions de modération, du plus récent au plus ancien. */
  listAudit(cursor?: string): Promise<AuditPage>;

  /**
   * O2 — POST /sync : rejoue un lot d'actions hors ligne (50 au plus, dans l'ordre). L'`opId`
   * sert de clé d'idempotence : une action déjà envoyée seule n'est pas appliquée deux fois.
   * Absent du serveur simulé, qui rejoue les actions une par une.
   */
  sync?(items: { opId: ID; action: OfflineAction }[]): Promise<SyncOutcome[]>;

  /* Systalink et impact — /status, /impact */
  getStatus(): Promise<SystemStatus>;
  /** Y5 : null sans historique mesuré (serveur simulé), plutôt qu'une courbe inventée. */
  getStatusHistory(days: number): Promise<StatusHistory | null>;
  getImpact(): Promise<ImpactStats>;
  /** Idées A et B : renvois vers Systalink, projets en production chez Systalink. */
  getEcosystem(): Promise<SystalinkEcosystem>;
}
