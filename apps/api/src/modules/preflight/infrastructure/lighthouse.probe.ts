import type { PreflightLighthouse } from '@devhub/contracts';
import { parsePageSpeed } from '../domain/lighthouse';

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export class LighthouseUnavailableError extends Error {}

/**
 * Lighthouse réel via l'API PageSpeed Insights : l'audit tourne chez Google (rien ne pèse sur le
 * serveur DevHub ni sur Systalink). Sans clé, Google accepte un petit volume ; PAGESPEED_API_KEY
 * relève ce quota. L'audit prend souvent 15 à 40 s.
 */
export async function probeLighthouse(
  url: string,
  apiKey: string | undefined,
  timeoutMs = 75_000,
): Promise<PreflightLighthouse> {
  const q = new URLSearchParams({ url, strategy: 'mobile', locale: 'fr' });
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo'])
    q.append('category', c);
  if (apiKey) q.set('key', apiKey);
  const res = await fetch(`${ENDPOINT}?${q}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new LighthouseUnavailableError(`PageSpeed Insights ${res.status}`);
  const parsed = parsePageSpeed(await res.json());
  if (!parsed) throw new LighthouseUnavailableError('empty');
  return parsed;
}
