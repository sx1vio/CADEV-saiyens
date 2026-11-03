import { z } from 'zod';

// Espace d'administration : application à part (apps/admin), session à part, double facteur.
// Toutes les routes /api/v1/admin/* répondent 404 sans session d'administration valide.

/** POST /api/v1/admin/session : e-mail, mot de passe et code à 6 chiffres de l'application d'authentification. */
export const AdminLoginRequest = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(200),
  code: z.string().regex(/^\d{6}$/),
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
});
export type AdminOverview = z.infer<typeof AdminOverview>;

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
  twoFactor: z.boolean(),
  lastSignInAt: z.iso.datetime().nullable(),
});
export type AdminAccountView = z.infer<typeof AdminAccountView>;

/** POST /api/v1/admin/admins (super-admin) : le mot de passe et le secret sont montrés une seule fois. */
export const AdminInviteRequest = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  name: z.string().trim().min(2).max(80),
  role: AdminRole.default('moderator'),
});
export type AdminInviteRequest = z.infer<typeof AdminInviteRequest>;

export const AdminInviteResponse = z.object({
  email: z.string(),
  password: z.string(),
  otpauthUrl: z.string(),
  secret: z.string(),
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
