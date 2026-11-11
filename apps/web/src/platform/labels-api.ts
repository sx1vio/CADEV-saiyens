import type { ListPreflightLabelsResponse, PreflightLabel } from '@devhub/contracts';
import { DomainError } from '@/services/types';

/* Label « DevHub Ready » : lecture publique (page /label/:domaine, Passport). */

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/v1${path}`, { headers: { Accept: 'application/json' } }).catch(
    () => {
      throw new DomainError('network.offline');
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string };
    throw new DomainError(err.code ?? `http.${res.status}`);
  }
  return (await res.json()) as T;
}

export const labelsApi = {
  get: (domain: string) => get<PreflightLabel>(`/labels/${encodeURIComponent(domain)}`),
  byOwner: (handle: string) =>
    get<ListPreflightLabelsResponse>(`/labels?owner=${encodeURIComponent(handle)}`),
  badgeUrl: (domain: string) => `/api/v1/labels/${encodeURIComponent(domain)}/badge.svg`,
};
