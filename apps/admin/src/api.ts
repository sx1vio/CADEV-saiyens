import type {
  AdminAccountView,
  AdminActivityItem,
  AdminContentAction,
  AdminContentType,
  AdminContentView,
  AdminFeedJob,
  AdminFeedsView,
  AdminInviteRequest,
  AdminInviteResponse,
  AdminRole,
  AdminStats,
  AdminSystalinkView,
  AdminUserAction,
  AdminUsersResponse,
  AnnouncementInput,
  AnnouncementView,
  AdminCompanyAction,
  AdminCompanyView,
  AdminJobView,
  AdminJobsResponse,
  AdminOverview,
  AdminSessionView,
  JobOfferInput,
  ListAuditResponse,
  ListReportsResponse,
  ReportActionRequest,
  ReportActionResponse,
} from '@devhub/contracts';

/** Erreur de l'API au format Problem Details (RFC 9457). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;
  constructor(status: number, code: string, title: string, fields: Record<string, string> = {}) {
    super(title);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type Issue = { path?: (string | number)[]; message?: string };

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  idempotent = false,
): Promise<T> {
  const headers: Record<string, string> = { 'X-DevHub-Client': 'admin' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotent) headers['Idempotency-Key'] = crypto.randomUUID();
  const res = await fetch(`/api/v1/admin${path}`, {
    method,
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as
    (T & { code?: string; title?: string; errors?: Issue[] }) | null;
  if (!res.ok) {
    const fields: Record<string, string> = {};
    for (const e of data?.errors ?? []) {
      const key = e.path?.[0];
      if (key !== undefined && e.message) fields[String(key)] = e.message;
    }
    throw new ApiError(res.status, data?.code ?? 'error', data?.title ?? res.statusText, fields);
  }
  return data as T;
}

export const api = {
  signIn: (body: { email: string; password: string; code: string }) =>
    call<void>('POST', '/session', body),
  session: () => call<AdminSessionView>('GET', '/session'),
  signOut: () => call<void>('DELETE', '/session'),
  overview: () => call<AdminOverview>('GET', '/overview'),
  systalink: () => call<AdminSystalinkView>('GET', '/systalink'),
  jobs: () => call<AdminJobsResponse>('GET', '/jobs'),
  createJob: (body: JobOfferInput) => call<AdminJobView>('POST', '/jobs', body),
  updateJob: (id: string, body: JobOfferInput) => call<AdminJobView>('PUT', `/jobs/${id}`, body),
  deleteJob: (id: string) => call<void>('DELETE', `/jobs/${id}`),
  reports: (status: 'open' | 'actioned' | 'dismissed') =>
    call<ListReportsResponse>('GET', `/reports?status=${status}&limit=50`),
  reportAction: (id: string, body: ReportActionRequest) =>
    call<ReportActionResponse>('POST', `/reports/${id}/action`, body, true),
  audit: () => call<ListAuditResponse>('GET', '/audit?limit=50'),
  companies: (status?: string) =>
    call<{ data: AdminCompanyView[] }>('GET', `/companies${status ? `?status=${status}` : ''}`),
  companyAction: (id: string, body: AdminCompanyAction) =>
    call<void>('POST', `/companies/${id}/action`, body),
  users: (p: { q?: string; filter?: string; offset?: number }) =>
    call<AdminUsersResponse>('GET', `/users?${qs(p)}`),
  userAction: (id: string, body: AdminUserAction) =>
    call<void>('POST', `/users/${id}/action`, body),
  content: (p: { type: AdminContentType; q?: string; state?: string }) =>
    call<{ data: AdminContentView[] }>('GET', `/content?${qs(p)}`),
  contentAction: (type: AdminContentType, id: string, body: AdminContentAction) =>
    call<void>('POST', `/content/${type}/${id}`, body),
  activity: () => call<{ data: AdminActivityItem[] }>('GET', '/activity'),
  stats: () => call<AdminStats>('GET', '/stats'),
  feeds: () => call<AdminFeedsView>('GET', '/feeds'),
  runFeed: (job: AdminFeedJob) => call<void>('POST', '/feeds/run', { job }),
  announcements: () => call<{ data: AnnouncementView[] }>('GET', '/announcements'),
  createAnnouncement: (body: AnnouncementInput) =>
    call<AnnouncementView>('POST', '/announcements', body),
  updateAnnouncement: (id: string, body: AnnouncementInput) =>
    call<AnnouncementView>('PUT', `/announcements/${id}`, body),
  deleteAnnouncement: (id: string) => call<void>('DELETE', `/announcements/${id}`),
  admins: () => call<{ data: AdminAccountView[] }>('GET', '/admins'),
  inviteAdmin: (body: AdminInviteRequest) => call<AdminInviteResponse>('POST', '/admins', body),
  setAdminRole: (id: string, role: AdminRole | null) =>
    call<void>('PATCH', `/admins/${id}`, { role }),
};

function qs(p: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') u.set(k, String(v));
  return u.toString();
}

/** Site public, pour ouvrir un contenu ou un profil depuis l'administration. */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined) ??
  (location.hostname === 'localhost'
    ? 'http://localhost:5199'
    : `${location.protocol}//${location.hostname.replace(/^admin\./, '')}`);

/** Une erreur 404 sur une route d'administration veut dire : session expirée ou absente. */
export const isSignedOut = (e: unknown) => e instanceof ApiError && e.status === 404;

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'admin.bad_credentials') return 'E-mail, mot de passe ou code incorrect.';
    if (e.code === 'rate_limited') return 'Trop de tentatives. Réessaie dans 15 minutes.';
    if (e.code === 'validation.failed') return 'Certains champs ne sont pas valides.';
    if (e.code === 'admin.super_only') return 'Réservé aux super-administrateurs.';
    if (e.code === 'admin.target_is_admin')
      return 'C’est un administrateur : retire d’abord son accès dans l’onglet Administrateurs.';
    if (e.code === 'admin.self') return 'Tu ne peux pas changer ton propre rôle.';
    if (e.code === 'admin.reason_required') return 'Indique une raison (3 caractères au moins).';
    if (e.code === 'auth.email_taken') return 'Cette adresse est déjà utilisée par un compte.';
    return e.message;
  }
  return 'Le serveur ne répond pas. Vérifie ta connexion.';
}
