import { z } from 'zod';

// Espace d'administration : application à part (apps/admin), session à part.
// Toutes les routes /api/v1/admin/* répondent 404 sans session d'administration valide.

/** POST /api/v1/admin/session : e-mail et mot de passe d'un compte créé par la CLI ou un super-admin. */
export const AdminLoginRequest = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(200),
});
export type AdminLoginRequest = z.infer<typeof AdminLoginRequest>;

/** GET /api/v1/admin/session */
export const AdminRole = z.enum(['super', 'moderator']);
export type AdminRole = z.infer<typeof AdminRole>;

export const AdminSessionView = z.object({
  handle: z.string(),
  displayName: z.string(),
  role: AdminRole,
  expiresAt: z.iso.datetime(),
});
export type AdminSessionView = z.infer<typeof AdminSessionView>;

/** GET /api/v1/admin/overview : chiffres réels de la plateforme. */
export const AdminOverview = z.object({
  users: z.number().int(),
  newUsers7d: z.number().int(),
  questions: z.number().int(),
  answers: z.number().int(),
  rooms: z.number().int(),
  openReports: z.number().int(),
  publishedJobs: z.number().int(),
  draftJobs: z.number().int(),
  /** Entreprises du portail en attente de vérification */
  pendingCompanies: z.number().int(),
});
export type AdminOverview = z.infer<typeof AdminOverview>;

/* ---------------- Supervision ---------------- */

const HttpWindow = z.object({
  requests: z.number().int(),
  clientErrors: z.number().int(),
  serverErrors: z.number().int(),
  p50Ms: z.number().nullable(),
  p95Ms: z.number().nullable(),
});

/** GET /api/v1/admin/monitoring : santé technique de la plateforme, à cet instant. */
export const AdminMonitoringView = z.object({
  checkedAt: z.iso.datetime(),
  api: z.object({
    startedAt: z.iso.datetime(),
    uptimeSeconds: z.number().int(),
    nodeVersion: z.string(),
    environment: z.string(),
    /** Identifiant de la version déployée (commit), si fourni au déploiement */
    release: z.string().nullable(),
    memoryMb: z.object({ rss: z.number(), heapUsed: z.number() }),
    eventLoopDelayMs: z.number().nullable(),
  }),
  http: z.object({
    last5m: HttpWindow,
    lastHour: HttpWindow,
    slowestRoutes: z.array(
      z.object({
        route: z.string(),
        requests: z.number().int(),
        serverErrors: z.number().int(),
        p95Ms: z.number(),
      }),
    ),
    recentErrors: z.array(
      z.object({
        at: z.iso.datetime(),
        method: z.string(),
        path: z.string(),
        requestId: z.string().nullable(),
        message: z.string(),
      }),
    ),
  }),
  database: z.object({
    ok: z.boolean(),
    latencyMs: z.number().nullable(),
    sizeMb: z.number().nullable(),
    connections: z.number().int().nullable(),
    migrations: z.number().int().nullable(),
    lastMigration: z.string().nullable(),
    largestTables: z.array(z.object({ table: z.string(), rows: z.number().int() })),
  }),
  worker: z.object({
    /** Le worker a fait tourner son planificateur il y a moins de 3 minutes */
    alive: z.boolean(),
    lastBeatAt: z.iso.datetime().nullable(),
    queues: z.array(
      z.object({
        name: z.string(),
        cron: z.string().nullable(),
        waiting: z.number().int(),
        active: z.number().int(),
        completed24h: z.number().int(),
        failed24h: z.number().int(),
        lastCompletedAt: z.iso.datetime().nullable(),
      }),
    ),
    recentFailures: z.array(
      z.object({ queue: z.string(), at: z.iso.datetime().nullable(), message: z.string() }),
    ),
  }),
  services: z.array(
    z.object({
      service: z.string(),
      ok: z.boolean(),
      /** Faux quand le service n'est pas encore branché (ex. BACKUP_STATUS_URL absent) */
      configured: z.boolean(),
      latencyMs: z.number().nullable(),
      checkedAt: z.iso.datetime(),
    }),
  ),
  /** Réglages de production : présents ou non, jamais leur valeur */
  config: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      state: z.enum(['ok', 'missing', 'danger']),
      hint: z.string(),
    }),
  ),
  security: z.object({
    activeAdminSessions: z.number().int(),
    adminSignIns24h: z.number().int(),
    memberSessions24h: z.number().int(),
    suspendedUsers: z.number().int(),
    openReports: z.number().int(),
  }),
});
export type AdminMonitoringView = z.infer<typeof AdminMonitoringView>;

/* ---------------- Utilisateurs ---------------- */

export const AdminUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  filter: z.enum(['all', 'new', 'suspended', 'admins', 'demo', 'deleted']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});
export type AdminUsersQuery = z.infer<typeof AdminUsersQuery>;

export const AdminUserView = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  country: z.string().nullable(),
  githubLinked: z.boolean(),
  isAdmin: z.boolean(),
  adminRole: AdminRole.nullable(),
  isDemo: z.boolean(),
  suspendedAt: z.iso.datetime().nullable(),
  suspensionReason: z.string().nullable(),
  deleted: z.boolean(),
  createdAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime().nullable(),
  stats: z.object({
    questions: z.number().int(),
    answers: z.number().int(),
    posts: z.number().int(),
    rooms: z.number().int(),
    xp: z.number().int(),
    reportsAgainst: z.number().int(),
  }),
});
export type AdminUserView = z.infer<typeof AdminUserView>;

export const AdminUsersResponse = z.object({
  data: z.array(AdminUserView),
  total: z.number().int(),
});
export type AdminUsersResponse = z.infer<typeof AdminUsersResponse>;

/** POST /api/v1/admin/users/:id/action */
export const AdminUserAction = z.object({
  action: z.enum(['suspend', 'unsuspend', 'delete', 'mark_demo', 'unmark_demo']),
  reason: z.string().trim().max(500).default(''),
});
export type AdminUserAction = z.infer<typeof AdminUserAction>;

/* ---------------- Contenus ---------------- */

export const AdminContentType = z.enum([
  'question',
  'answer',
  'room',
  'room_message',
  'post',
  'post_comment',
  'bench_request',
]);
export type AdminContentType = z.infer<typeof AdminContentType>;

export const AdminContentQuery = z.object({
  type: AdminContentType,
  q: z.string().trim().max(100).optional(),
  state: z.enum(['all', 'visible', 'hidden']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AdminContentQuery = z.infer<typeof AdminContentQuery>;

export const AdminContentView = z.object({
  type: AdminContentType,
  id: z.uuid(),
  title: z.string().nullable(),
  excerpt: z.string(),
  author: z.object({ handle: z.string(), displayName: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
  hidden: z.boolean(),
  /** Lien vers le contenu sur le site public */
  path: z.string().nullable(),
});
export type AdminContentView = z.infer<typeof AdminContentView>;

/** POST /api/v1/admin/content/:type/:id */
export const AdminContentAction = z.object({
  action: z.enum(['hide', 'restore']),
  reason: z.string().trim().min(3).max(500),
});
export type AdminContentAction = z.infer<typeof AdminContentAction>;

/* ---------------- Activité et statistiques ---------------- */

export const AdminActivityItem = z.object({
  at: z.iso.datetime(),
  kind: z.enum([
    'user',
    'question',
    'answer',
    'post',
    'comment',
    'room',
    'application',
    'company',
    'job',
    'admin',
  ]),
  label: z.string(),
  actor: z.string().nullable(),
  path: z.string().nullable(),
});
export type AdminActivityItem = z.infer<typeof AdminActivityItem>;

export const AdminStats = z.object({
  days: z.array(
    z.object({
      date: z.string(),
      users: z.number().int(),
      questions: z.number().int(),
      answers: z.number().int(),
      posts: z.number().int(),
      applications: z.number().int(),
      rooms: z.number().int(),
    }),
  ),
  activeUsers7d: z.number().int(),
  activeUsers30d: z.number().int(),
});
export type AdminStats = z.infer<typeof AdminStats>;

/* ---------------- Annonces ---------------- */

export const AnnouncementLevel = z.enum(['info', 'warning', 'success']);
export const AnnouncementInput = z.object({
  message: z.string().trim().min(5).max(300),
  level: AnnouncementLevel.default('info'),
  linkUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v.startsWith('/') || /^https:\/\//.test(v), 'Lien interne (/…) ou https://')
    .nullable()
    .default(null),
  linkLabel: z.string().trim().max(40).nullable().default(null),
  startsAt: z.iso.datetime().nullable().default(null),
  endsAt: z.iso.datetime().nullable().default(null),
  active: z.boolean().default(true),
});
export type AnnouncementInput = z.infer<typeof AnnouncementInput>;

export const AnnouncementView = AnnouncementInput.extend({
  id: z.uuid(),
  startsAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});
export type AnnouncementView = z.infer<typeof AnnouncementView>;

/** GET /api/v1/announcements : annonces actives, publiques. */
export const ActiveAnnouncementsResponse = z.object({
  data: z.array(
    AnnouncementView.pick({ id: true, message: true, level: true, linkUrl: true, linkLabel: true }),
  ),
});
export type ActiveAnnouncementsResponse = z.infer<typeof ActiveAnnouncementsResponse>;

/* ---------------- Administrateurs ---------------- */

export const AdminAccountView = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  role: AdminRole,
  lastSignInAt: z.iso.datetime().nullable(),
});
export type AdminAccountView = z.infer<typeof AdminAccountView>;

/** POST /api/v1/admin/admins (super-admin) : le mot de passe est montré une seule fois. */
export const AdminInviteRequest = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  name: z.string().trim().min(2).max(80),
  role: AdminRole.default('moderator'),
});
export type AdminInviteRequest = z.infer<typeof AdminInviteRequest>;

export const AdminInviteResponse = z.object({
  email: z.string(),
  password: z.string(),
});
export type AdminInviteResponse = z.infer<typeof AdminInviteResponse>;

/** PATCH /api/v1/admin/admins/:id */
export const AdminRoleRequest = z.object({ role: AdminRole.nullable() });
export type AdminRoleRequest = z.infer<typeof AdminRoleRequest>;

/* ---------------- Flux de contenu (collecte automatique) ---------------- */

export const AdminFeedJob = z.enum(['news', 'github', 'jobs', 'certs', 'skills']);
export type AdminFeedJob = z.infer<typeof AdminFeedJob>;

export const AdminFeedsView = z.object({
  counts: z.array(
    z.object({ kind: z.string(), items: z.number().int(), last: z.iso.datetime().nullable() }),
  ),
  runs: z.array(
    z.object({
      id: z.number().int(),
      startedAt: z.iso.datetime(),
      finishedAt: z.iso.datetime().nullable(),
      items: z.number().int(),
      sourcesOk: z.number().int(),
      errors: z.array(z.object({ source: z.string(), error: z.string() })),
    }),
  ),
});
export type AdminFeedsView = z.infer<typeof AdminFeedsView>;

/** POST /api/v1/admin/feeds/run */
export const AdminFeedRunRequest = z.object({ job: AdminFeedJob });
export type AdminFeedRunRequest = z.infer<typeof AdminFeedRunRequest>;

/** GET /api/v1/admin/systalink : ce que DevHub apporte à Systalink, chiffres réels. */
export const AdminSystalinkView = z.object({
  referrals: z.object({
    total: z.number().int(),
    last30d: z.number().int(),
    byTarget: z.array(z.object({ key: z.string(), n: z.number().int() })),
    bySource: z.array(z.object({ key: z.string(), n: z.number().int() })),
    days: z.array(z.object({ date: z.string(), n: z.number().int() })),
  }),
  deployments: z.object({
    verified: z.number().int(),
    onSystalink: z.number().int(),
    /** Disponibilité moyenne mesurée des applications sur Systalink, en %. */
    uptime: z.number().nullable(),
    items: z.array(
      z.object({
        room: z.string(),
        code: z.string(),
        url: z.string(),
        hostedOnSystalink: z.boolean(),
        verifiedAt: z.iso.datetime().nullable(),
        lastUp: z.boolean().nullable(),
        lastLatencyMs: z.number().int().nullable(),
        uptime: z.number().nullable(),
      }),
    ),
  }),
  preflight: z.object({
    reports: z.number().int(),
    /** Rapports dont le site est hébergé chez Systalink (contrôle host.systalink réussi). */
    onSystalink: z.number().int(),
    last30d: z.number().int(),
  }),
  bench: z.object({
    requests: z.number().int(),
    reports: z.number().int(),
    confirmed: z.number().int(),
  }),
  certificates: z.number().int(),
});
export type AdminSystalinkView = z.infer<typeof AdminSystalinkView>;

/* ---------------- Contenus éditoriaux (11/11/2026) ----------------
 * Actualités, vidéos, skills IA, dépôts, versions, certifications et offres collectés : tout ce
 * que montrent le fil, l'actualité, les skills et les certifications. L'administration ajoute un
 * contenu à partir de son lien, le modifie, le retire ou le remet en ligne. */

export const ADMIN_NEWS_KINDS = [
  'article',
  'video',
  'skill',
  'repo',
  'release',
  'cert',
  'job',
  'hn',
  'devto',
] as const;
export const AdminNewsKind = z.enum(ADMIN_NEWS_KINDS);
export type AdminNewsKind = z.infer<typeof AdminNewsKind>;

/** Rubriques du fil (catégorie d'un contenu). */
export const ADMIN_NEWS_CATEGORIES = [
  'ia',
  'dev',
  'tech',
  'mobile',
  'cloud',
  'securite',
  'afrique',
  'apple',
  'google',
  'samsung',
] as const;

export const AdminNewsQuery = z.object({
  kind: AdminNewsKind.optional(),
  q: z.string().trim().max(100).optional(),
  state: z.enum(['all', 'visible', 'hidden', 'curated']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});
export type AdminNewsQuery = z.infer<typeof AdminNewsQuery>;

export const AdminNewsItem = z.object({
  id: z.string(),
  kind: AdminNewsKind,
  source: z.string(),
  sourceName: z.string(),
  category: z.string(),
  lang: z.enum(['fr', 'en']),
  title: z.string(),
  summary: z.string(),
  url: z.string(),
  image: z.string().nullable(),
  publishedAt: z.iso.datetime(),
  hidden: z.boolean(),
  /** Ajouté ou modifié par l'administration : la collecte ne le touche plus. */
  curated: z.boolean(),
});
export type AdminNewsItem = z.infer<typeof AdminNewsItem>;

export const AdminNewsListResponse = z.object({
  data: z.array(AdminNewsItem),
  total: z.number().int(),
});
export type AdminNewsListResponse = z.infer<typeof AdminNewsListResponse>;

const HttpsLink = z.url({ protocol: /^https$/ }).max(1000);

export const AdminNewsPreviewRequest = z.object({ url: HttpsLink });
export type AdminNewsPreviewRequest = z.infer<typeof AdminNewsPreviewRequest>;

/** Brouillon lu sur la page du lien (Open Graph) : l'administrateur le corrige avant d'enregistrer. */
export const AdminNewsPreview = z.object({
  url: z.string(),
  title: z.string(),
  summary: z.string(),
  image: z.string().nullable(),
  sourceName: z.string(),
  lang: z.enum(['fr', 'en']),
  publishedAt: z.iso.datetime().nullable(),
  /** Déjà en base : l'enregistrer le remplace. */
  existingId: z.string().nullable(),
});
export type AdminNewsPreview = z.infer<typeof AdminNewsPreview>;

export const AdminNewsInput = z.object({
  url: HttpsLink,
  kind: AdminNewsKind,
  category: z.string().trim().min(2).max(20),
  lang: z.enum(['fr', 'en']),
  title: z.string().trim().min(3).max(400),
  summary: z.string().trim().max(2000).default(''),
  image: HttpsLink.nullable().default(null),
  sourceName: z.string().trim().min(1).max(80),
  publishedAt: z.iso.datetime().nullable().default(null),
});
export type AdminNewsInput = z.infer<typeof AdminNewsInput>;
