import type {
  ApplicationStatusRequest,
  ApplicationView,
  BusinessJobInput,
  BusinessJobView,
  BusinessMeView,
  BusinessRegisterRequest,
  CompanyProfileInput,
  CompanyView,
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

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-DevHub-Client': 'business' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api/v1/business${path}`, {
    method,
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new ApiError(0, 'network', 'Le serveur ne répond pas. Vérifie ta connexion.');
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as
    (T & { code?: string; title?: string; errors?: Issue[] }) | null;
  if (!res.ok) {
    const fields: Record<string, string> = {};
    for (const e of data?.errors ?? []) {
      const key = e.path?.join('.');
      if (key && e.message) fields[key] = e.message;
    }
    throw new ApiError(res.status, data?.code ?? 'error', data?.title ?? res.statusText, fields);
  }
  return data as T;
}

export const api = {
  register: (body: BusinessRegisterRequest) => call<void>('POST', '/register', body),
  signIn: (body: { email: string; password: string }) => call<void>('POST', '/session', body),
  signOut: () => call<void>('DELETE', '/session'),
  me: () => call<BusinessMeView>('GET', '/me'),
  updateCompany: (body: CompanyProfileInput) => call<CompanyView>('PUT', '/company', body),
  jobs: () => call<{ data: BusinessJobView[] }>('GET', '/jobs'),
  createJob: (body: BusinessJobInput) => call<BusinessJobView>('POST', '/jobs', body),
  updateJob: (id: string, body: BusinessJobInput) =>
    call<BusinessJobView>('PUT', `/jobs/${id}`, body),
  deleteJob: (id: string) => call<void>('DELETE', `/jobs/${id}`),
  applications: (jobId: string) =>
    call<{ data: ApplicationView[] }>('GET', `/jobs/${jobId}/applications`),
  setStatus: (id: string, body: ApplicationStatusRequest) =>
    call<void>('PATCH', `/applications/${id}`, body),
};

export const isSignedOut = (e: unknown) => e instanceof ApiError && e.status === 404;

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'auth.bad_credentials') return 'E-mail ou mot de passe incorrect.';
    if (e.code === 'auth.email_taken') return 'Un compte existe déjà avec cette adresse.';
    if (e.code === 'rate_limited') return 'Trop de tentatives. Réessaie dans 15 minutes.';
    if (e.code === 'company.not_verified')
      return 'Ton entreprise doit être validée par l’équipe DevHub avant de publier. Enregistre l’offre en brouillon.';
    if (e.code === 'validation.failed') return 'Certains champs ne sont pas valides.';
    return e.message;
  }
  return 'Le serveur ne répond pas. Vérifie ta connexion.';
}

/** Lien vers l'application publique (Passport d'un candidat, page de l'entreprise). */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined) ??
  (location.hostname === 'localhost'
    ? 'http://localhost:5199'
    : location.origin.replace('//business.', '//'));
