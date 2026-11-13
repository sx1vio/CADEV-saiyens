import type { PublicJobView } from '@devhub/contracts';
import { storageGet, storageSet } from '@/lib/utils';

export type JobOffer = PublicJobView;

export const CONTRACT_LABEL: Record<JobOffer['contract'], string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  freelance: 'Freelance',
  stage: 'Stage',
  alternance: 'Alternance',
};
export const MODE_LABEL: Record<JobOffer['workMode'], string> = {
  remote: 'Télétravail',
  hybrid: 'Hybride',
  onsite: 'Sur site',
};
export const SENIORITY_LABEL: Record<JobOffer['seniority'], string> = {
  junior: 'Junior',
  confirme: 'Confirmé',
  senior: 'Senior',
  lead: 'Lead',
};

const KEY = 'dh-jobs';

/**
 * Offres publiées par l'équipe DevHub (GET /api/v1/jobs), chacune reliée à son annonce officielle.
 * Gardées sur l'appareil pour rester lisibles hors ligne.
 */
export async function fetchJobs(): Promise<JobOffer[]> {
  try {
    const res = await fetch('/api/v1/jobs', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = (await res.json()) as { data: JobOffer[] };
    storageSet(KEY, JSON.stringify(data));
    return data;
  } catch (e) {
    const cached = storageGet(KEY);
    if (cached) return JSON.parse(cached) as JobOffer[];
    // Sans API (aperçu local du front) : aucune offre plutôt que des offres inventées.
    if (e instanceof TypeError || (e instanceof Error && /HTTP 404/.test(e.message))) return [];
    throw e;
  }
}

/** Hôte lisible d'un lien (« careers.wave.com ») pour annoncer où mène le bouton. */
export const hostOf = (url: string) => {
  if (url.startsWith('mailto:')) return url.slice(7);
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/* ---------------- Candidatures sur DevHub (offres d'entreprises inscrites) ---------------- */

import {
  CV_MAX_BYTES,
  type ApplyRequest,
  type CompanyPublicView,
  type MyApplicationView,
  type UploadCvResponse,
} from '@devhub/contracts';
import { DomainError } from '@/services/types';

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['X-DevHub-Client'] = 'web';
    headers['Idempotency-Key'] = crypto.randomUUID();
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new DomainError('network.offline');
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string };
    throw new DomainError(err.code ?? `http.${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export type { MyApplicationView, CompanyPublicView };

export const careers = {
  apply: (jobId: string, body: ApplyRequest) => send<void>('POST', `/jobs/${jobId}/apply`, body),
  /** CV en PDF (5 Mo au plus), envoyé tel quel puis joint à la candidature. */
  uploadCv: async (file: File): Promise<UploadCvResponse> => {
    if (file.size > CV_MAX_BYTES) throw new DomainError('cv.too_large');
    if (file.type && file.type !== 'application/pdf') throw new DomainError('cv.unsupported');
    const res = await fetch(`/api/v1/me/cv?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'X-DevHub-Client': 'web',
        'Idempotency-Key': crypto.randomUUID(),
      },
      credentials: 'include',
      body: file,
    }).catch(() => {
      throw new DomainError('network.offline');
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { code?: string };
      throw new DomainError(err.code ?? `http.${res.status}`);
    }
    return (await res.json()) as UploadCvResponse;
  },
  cvUrl: (id: string) => `/api/v1/me/cv/${id}`,
  mine: () => send<{ data: MyApplicationView[] }>('GET', '/me/applications').then((r) => r.data),
  withdraw: (id: string) => send<void>('DELETE', `/me/applications/${id}`),
  company: (slug: string) =>
    send<CompanyPublicView>('GET', `/companies/${encodeURIComponent(slug)}`),
};

export const APPLICATION_STATUS: Record<MyApplicationView['status'], string> = {
  submitted: 'Envoyée',
  seen: 'Consultée',
  interview: 'Entretien proposé',
  rejected: 'Non retenue',
  hired: 'Acceptée',
  withdrawn: 'Retirée',
};

/** Portail entreprise (business.<domaine> en production, port 5399 en local). */
export const BUSINESS_URL: string =
  (import.meta.env.VITE_BUSINESS_URL as string | undefined) ??
  (location.hostname === 'localhost'
    ? 'http://localhost:5399'
    : `${location.protocol}//business.${location.hostname.replace(/^www\./, '')}`);
