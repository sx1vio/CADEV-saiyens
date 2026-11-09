import type { NextFunction, Request, Response } from 'express';

// Mesures HTTP du process API, en mémoire, pour l'onglet « Supervision » de l'administration :
// volumes, erreurs et latences de la dernière heure, et les dernières erreurs serveur.
// Rien n'est écrit en base ; un redémarrage remet les compteurs à zéro (startedAt le dit).

export interface RequestSample {
  at: number;
  method: string;
  route: string;
  status: number;
  ms: number;
}

export interface ServerErrorSample {
  at: string;
  method: string;
  path: string;
  requestId: string | null;
  message: string;
}

export interface WindowStats {
  requests: number;
  clientErrors: number;
  serverErrors: number;
  p50Ms: number | null;
  p95Ms: number | null;
}

export interface RouteStats {
  route: string;
  requests: number;
  serverErrors: number;
  p95Ms: number;
}

const HOUR = 60 * 60 * 1000;
const MAX_SAMPLES = 20_000;
const MAX_ERRORS = 30;

export function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i]!;
}

function stats(samples: RequestSample[]): WindowStats {
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  return {
    requests: samples.length,
    clientErrors: samples.filter((s) => s.status >= 400 && s.status < 500).length,
    serverErrors: samples.filter((s) => s.status >= 500).length,
    p50Ms: percentile(ms, 50),
    p95Ms: percentile(ms, 95),
  };
}

export class HttpMetrics {
  readonly startedAt = new Date();
  private samples: RequestSample[] = [];
  private errors: ServerErrorSample[] = [];

  record(sample: RequestSample): void {
    this.samples.push(sample);
    if (this.samples.length > MAX_SAMPLES)
      this.samples.splice(0, this.samples.length - MAX_SAMPLES);
  }

  recordError(error: ServerErrorSample): void {
    this.errors.unshift(error);
    if (this.errors.length > MAX_ERRORS) this.errors.length = MAX_ERRORS;
  }

  private recent(now: number, windowMs: number): RequestSample[] {
    return this.samples.filter((s) => s.at >= now - windowMs);
  }

  snapshot(now = Date.now()) {
    // Les échantillons de plus d'une heure ne servent plus.
    this.samples = this.recent(now, HOUR);
    const lastHour = this.samples;
    const byRoute = new Map<string, RequestSample[]>();
    for (const s of lastHour) {
      const list = byRoute.get(s.route);
      if (list) list.push(s);
      else byRoute.set(s.route, [s]);
    }
    const routes: RouteStats[] = [...byRoute.entries()]
      .map(([route, list]) => {
        const st = stats(list);
        return {
          route,
          requests: st.requests,
          serverErrors: st.serverErrors,
          p95Ms: st.p95Ms ?? 0,
        };
      })
      .sort((a, b) => b.p95Ms - a.p95Ms)
      .slice(0, 8);
    return {
      last5m: stats(this.recent(now, 5 * 60 * 1000)),
      lastHour: stats(lastHour),
      slowestRoutes: routes,
      recentErrors: [...this.errors],
    };
  }
}

/** Instance unique du process (middleware, filtre d'erreurs et contrôleur la partagent). */
export const httpMetrics = new HttpMetrics();

// Les sondes de santé et les ressources statiques faussent les moyennes : on les ignore.
const IGNORED = /^\/(readyz|api\/v1\/healthz|api\/v1\/news\/image)/;

/** Middleware Express : mesure chaque requête de l'API à la fin de la réponse. */
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (IGNORED.test(req.path)) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
    // Gabarit de la route (/api/v1/questions/:id) pour regrouper ; jamais l'URL avec ses données.
    const template = (req.route as { path?: string } | undefined)?.path;
    const route = template ? `${req.method} ${req.baseUrl}${template}` : `${req.method} (autre)`;
    httpMetrics.record({ at: Date.now(), method: req.method, route, status: res.statusCode, ms });
  });
  next();
}
