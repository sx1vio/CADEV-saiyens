import { DomainError } from '@/services/types';

/**
 * Appel direct à l'API (/api/v1) pour les services sans file hors ligne : erreurs traduites en
 * DomainError avec le code stable renvoyé par le serveur (« bench.full », « cert.retry_later »…).
 */
export async function apiCall<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['X-DevHub-Client'] = 'web';
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new DomainError('network.offline');
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const params: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(err))
      if (typeof v === 'string' || typeof v === 'number') params[k] = v;
    throw new DomainError(typeof err.code === 'string' ? err.code : `http.${res.status}`, params);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
