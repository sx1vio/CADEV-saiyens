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
