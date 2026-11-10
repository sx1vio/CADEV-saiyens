import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { httpMetrics } from './http-metrics';

// Erreurs au format RFC 9457 (application/problem+json) : docs/architecture/06-api.md#erreurs
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  instance: string;
  requestId?: string;
  errors?: unknown[];
  /** Conflit de version (409 version_conflict) : la version actuelle côté serveur. */
  server?: unknown;
  /** Secondes avant de réessayer (429) : renvoyé aussi dans l'en-tête Retry-After. */
  retryAfter?: number;
}

const ERROR_BASE = 'https://devhub.africa/errors/';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'validation.failed',
  401: 'auth.required',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable',
  429: 'rate_limited',
};

export function toProblem(
  exception: unknown,
  instance: string,
  requestId?: string,
): ProblemDetails {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const body =
      typeof response === 'object' && response !== null
        ? (response as Record<string, unknown>)
        : {};
    const code = typeof body.code === 'string' ? body.code : (CODE_BY_STATUS[status] ?? 'error');
    let title = typeof body.title === 'string' ? body.title : exception.message;
    // Route inconnue : Express répond « Cannot GET /api/v1/… ». Le même titre que pour une route
    // protégée et masquée, sinon la différence permet de cartographier les routes (SEC-01, SEC-04).
    if (status === 404 && /^Cannot [A-Z]+ /.test(title)) title = 'Not found';
    return {
      type: ERROR_BASE + code,
      title,
      status,
      code,
      instance,
      requestId,
      ...(Array.isArray(body.errors) ? { errors: body.errors } : {}),
      ...(body.server !== undefined ? { server: body.server } : {}),
      ...(typeof body.retryAfter === 'number' ? { retryAfter: body.retryAfter } : {}),
    };
  }
  // Erreur inattendue : aucun détail interne n'est exposé.
  return {
    type: ERROR_BASE + 'internal',
    title: 'Internal Server Error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'internal',
    instance,
    requestId,
  };
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();
    const problem = toProblem(
      exception,
      request.originalUrl,
      request.id ? String(request.id) : undefined,
    );

    if (!(exception instanceof HttpException)) {
      this.logger.error({ err: exception, requestId: problem.requestId }, 'Unhandled error');
      httpMetrics.recordError({
        at: new Date().toISOString(),
        method: request.method,
        // Chemin sans la chaîne de requête : elle peut contenir des données personnelles.
        path: request.originalUrl.split('?')[0] ?? '',
        requestId: problem.requestId ?? null,
        message: exception instanceof Error ? exception.message.slice(0, 300) : String(exception),
      });
    }
    if (problem.retryAfter) response.setHeader('Retry-After', String(problem.retryAfter));
    response.status(problem.status).type('application/problem+json').json(problem);
  }
}
