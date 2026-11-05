import type { PreflightLoadStage } from '@devhub/contracts';
import { PREFLIGHT_LOAD_LIMITS } from '@devhub/contracts';
import { type LoadSample, stageHolds, summarizeStage } from '../domain/load';
import { type SafeFetcher, UnsafeTargetError } from './safe-fetch';

export interface LoadLimits {
  stages: readonly number[];
  stageMs: number;
  maxRequests: number;
}

/**
 * Montée en charge par paliers : à chaque palier, N « visiteurs » enchaînent des requêtes pendant
 * `stageMs`. On s'arrête au premier palier qui ne tient pas, ou au plafond de requêtes.
 * `hit` fait une requête et renvoie son résultat (« 200 », « 503 », « timeout », « error »).
 */
export async function runLoadStages(
  hit: () => Promise<string>,
  limits: LoadLimits = PREFLIGHT_LOAD_LIMITS,
  now: () => number = () => performance.now(),
): Promise<PreflightLoadStage[]> {
  const stages: PreflightLoadStage[] = [];
  let total = 0;
  for (const concurrency of limits.stages) {
    if (total >= limits.maxRequests) break;
    const samples: LoadSample[] = [];
    const start = now();
    const end = start + limits.stageMs;
    const worker = async () => {
      while (now() < end && total < limits.maxRequests) {
        total++;
        const t0 = now();
        const code = await hit();
        samples.push({ ms: now() - t0, code });
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    const stage = summarizeStage(concurrency, samples, now() - start);
    stages.push(stage);
    if (!stageHolds(stage)) break;
  }
  return stages;
}

/** Une requête réelle vers le site : lecture plafonnée, délai borné, anti-SSRF de SafeFetcher. */
export function httpHit(fetcher: SafeFetcher, url: string): () => Promise<string> {
  return async () => {
    try {
      const res = await fetcher.get(url, {
        maxBytes: PREFLIGHT_LOAD_LIMITS.maxBytesPerResponse,
        timeoutMs: PREFLIGHT_LOAD_LIMITS.requestTimeoutMs,
        maxRedirects: 2,
        headers: { 'Cache-Control': 'no-cache' },
      });
      return String(res.status);
    } catch (e) {
      if (e instanceof UnsafeTargetError) throw e;
      const name = (e as { name?: string }).name;
      return name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'error';
    }
  };
}
