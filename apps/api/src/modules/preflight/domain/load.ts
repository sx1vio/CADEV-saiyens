import type { PreflightCheck, PreflightLoadStage, PreflightLoadTest } from '@devhub/contracts';
import { PREFLIGHT_LOAD_LIMITS } from '@devhub/contracts';
import { formatMs } from './network';

// Test de charge : règles pures. Une montée par paliers de visiteurs simultanés ; on s'arrête au
// premier palier qui ne tient plus. « Tenir » = 95 % des réponses en moins de 2 s et moins de
// 2 % d'erreurs (5xx, 429, délai dépassé, connexion refusée).

export const HOLD_P95_MS = 2_000;
export const HOLD_ERROR_RATE = 0.02;

/** Une requête du test : durée et résultat (« 200 », « 503 », « timeout », « error »). */
export interface LoadSample {
  ms: number;
  code: string;
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[i]!);
}

export const isError = (code: string) =>
  code === 'timeout' || code === 'error' || code === '429' || code.startsWith('5');

export function summarizeStage(
  concurrency: number,
  samples: LoadSample[],
  durationMs: number,
): PreflightLoadStage {
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  const codes: Record<string, number> = {};
  for (const s of samples) codes[s.code] = (codes[s.code] ?? 0) + 1;
  return {
    concurrency,
    requests: samples.length,
    rps: Math.round((samples.length / Math.max(1, durationMs)) * 10_000) / 10,
    p50Ms: percentile(ms, 50),
    p95Ms: percentile(ms, 95),
    p99Ms: percentile(ms, 99),
    errors: samples.filter((s) => isError(s.code)).length,
    codes,
  };
}

export function stageHolds(stage: PreflightLoadStage): boolean {
  if (stage.requests === 0) return false;
  return stage.p95Ms < HOLD_P95_MS && stage.errors / stage.requests < HOLD_ERROR_RATE;
}

/** Résumé d'une montée en charge terminée (rupture, ou plafond atteint sans rupture). */
export function concludeLoad(
  stages: PreflightLoadStage[],
): Pick<PreflightLoadTest, 'maxStableConcurrency' | 'breakingConcurrency' | 'reachedCeiling'> {
  let maxStable = 0;
  let breaking: number | null = null;
  for (const s of stages) {
    if (stageHolds(s)) maxStable = s.concurrency;
    else {
      breaking = s.concurrency;
      break;
    }
  }
  const ceiling = PREFLIGHT_LOAD_LIMITS.stages.at(-1)!;
  return {
    maxStableConcurrency: maxStable,
    breakingConcurrency: breaking,
    reachedCeiling: breaking === null && maxStable === ceiling,
  };
}

const why = (s: PreflightLoadStage) => {
  const parts: string[] = [];
  if (s.p95Ms >= HOLD_P95_MS) parts.push(`95 % des réponses en ${formatMs(s.p95Ms)}`);
  if (s.errors) {
    const codes = Object.entries(s.codes)
      .filter(([c]) => isError(c))
      .map(
        ([c, n]) =>
          `${n} × ${c === 'timeout' ? 'délai dépassé' : c === 'error' ? 'connexion refusée' : `HTTP ${c}`}`,
      )
      .join(', ');
    parts.push(`${s.errors} erreurs sur ${s.requests} (${codes})`);
  }
  return parts.join(' ; ');
};

/** Contrôles du rapport tirés du test de charge. Les corrections visent un agent de codage. */
export function loadChecks(lt: PreflightLoadTest): PreflightCheck[] {
  const out: PreflightCheck[] = [];
  const evidence = lt.stages.map(
    (s) =>
      `${s.concurrency} simultanés : ${s.requests} requêtes, ${s.rps} req/s, médiane ${formatMs(s.p50Ms)}, p95 ${formatMs(s.p95Ms)}, ${s.errors} erreurs`,
  );
  const broke = lt.stages.find((s) => s.concurrency === lt.breakingConcurrency);
  const capacityFix = [
    'Pistes, de la plus rentable à la plus lourde :',
    '1. Servir la page et les fichiers statiques avec un cache (Cache-Control: public, max-age=31536000, immutable pour les fichiers versionnés ; un cache de quelques secondes sur le HTML).',
    '2. Activer la compression (Brotli ou gzip) au niveau du serveur web ou du reverse proxy.',
    '3. Mettre les réponses coûteuses en cache côté serveur (Redis ou mémoire) et ajouter les index manquants sur les requêtes de base de données.',
    '4. Lancer plusieurs processus de l’application (PM2 en mode cluster, plusieurs workers Gunicorn/Uvicorn, ou plusieurs conteneurs derrière le reverse proxy).',
    '5. Agrandir le pool de connexions à la base, puis la machine (VPS Systalink de taille supérieure) si les étapes précédentes ne suffisent pas.',
  ].join('\n');

  if (lt.breakingConcurrency === null) {
    out.push({
      id: 'load.capacity',
      category: 'load',
      status: 'pass',
      title: lt.reachedCeiling
        ? `Tient ${lt.maxStableConcurrency} visiteurs simultanés sans faiblir`
        : `Tient ${lt.maxStableConcurrency} visiteurs simultanés`,
      detail: `Montée par paliers jusqu’au plafond du pré-vol : 95 % des réponses restent sous ${formatMs(HOLD_P95_MS)} et les erreurs sous ${HOLD_ERROR_RATE * 100} %.`,
      fix: null,
      evidence,
    });
  } else {
    const severe = lt.breakingConcurrency <= 10;
    out.push({
      id: 'load.capacity',
      category: 'load',
      status: severe ? 'fail' : 'warn',
      title:
        lt.maxStableConcurrency === 0
          ? `Cède dès ${lt.breakingConcurrency} visiteurs simultanés`
          : `Tient ${lt.maxStableConcurrency} visiteurs simultanés, cède à ${lt.breakingConcurrency}`,
      detail: `${broke ? why(broke) : 'Le palier n’a pas tenu'}. ${
        severe
          ? 'Un partage sur un groupe WhatsApp ou une démo devant une salle suffit à rendre l’application inutilisable.'
          : 'Une mise en avant (lancement, article, publicité) dépassera ce seuil.'
      }`,
      fix: capacityFix,
      evidence,
    });
  }

  const all = lt.stages.reduce(
    (acc, s) => {
      for (const [c, n] of Object.entries(s.codes)) acc[c] = (acc[c] ?? 0) + n;
      return acc;
    },
    {} as Record<string, number>,
  );
  const server = Object.entries(all).filter(([c]) => c.startsWith('5'));
  if (server.length) {
    out.push({
      id: 'load.server_errors',
      category: 'load',
      status: 'fail',
      title: 'Erreurs serveur sous la charge',
      detail: `Le serveur a répondu ${server.map(([c, n]) => `${n} × HTTP ${c}`).join(', ')} pendant le test : des visiteurs voient une page d’erreur.`,
      fix: 'Lire les journaux du serveur sur la période du test (erreurs de connexion à la base, mémoire, nombre de fichiers ouverts), puis appliquer les pistes de load.capacity. Un 502/504 vient souvent du reverse proxy qui n’obtient pas de réponse de l’application à temps.',
      evidence: server.map(([c, n]) => `HTTP ${c} : ${n}`),
    });
  }
  if (all['429']) {
    out.push({
      id: 'load.rate_limited',
      category: 'load',
      status: 'info',
      title: 'Limitation de débit active',
      detail: `${all['429']} réponses 429 : une protection limite le nombre de requêtes par adresse. C’est sain, mais le test venait d’une seule adresse ; de vrais visiteurs, chacun sur sa propre adresse, ne seraient pas limités de la même façon.`,
      fix: null,
      evidence: [],
    });
  }
  const calm = lt.stages[0];
  if (calm && calm.p50Ms > 800) {
    out.push({
      id: 'load.slow_baseline',
      category: 'load',
      status: 'warn',
      title: `Réponse lente même sans charge (${formatMs(calm.p50Ms)})`,
      detail: `Avec ${calm.concurrency} visiteurs seulement, la réponse médiane prend ${formatMs(calm.p50Ms)} : le temps passe dans l’application, pas dans la charge.`,
      fix: 'Mesurer le temps de génération de la page (logs de durée par route), mettre en cache ce qui ne change pas à chaque visite, et vérifier les requêtes de base de données lancées pour cette page (requêtes N+1, index manquants).',
      evidence: [],
    });
  }
  return out;
}
