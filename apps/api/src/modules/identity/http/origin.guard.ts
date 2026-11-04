import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  NotFoundException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { ALLOW_API_TOKEN, bearerToken } from './api-token.guard';
import { SESSION_COOKIE, readCookie } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ALLOW_CROSS_ORIGIN = 'devhub:allow-cross-origin';

/**
 * Écriture appelable hors de l'application, sans cookie ni en-tête maison : réservée aux routes
 * dont un jeton signé fait la preuve (désabonnement en un clic, RFC 8058). À n'utiliser que là.
 */
export const AllowCrossOrigin = () => SetMetadata(ALLOW_CROSS_ORIGIN, true);

// Protection CSRF des écritures (docs/architecture/10-securite.md) : en plus de SameSite=Lax,
// toute requête qui modifie l'état doit venir de l'origine de l'application et porter X-DevHub-Client: web.
// Exception : les routes /api/v1/admin/* n'acceptent que l'origine de l'administration (ADMIN_URL)
// avec X-DevHub-Client: admin, jamais celle de l'application publique.
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly appOrigin: string;
  private readonly adminOrigin: string | null;
  private readonly businessOrigin: string | null;

  constructor(
    @Inject(ENV) env: Env,
    private readonly reflector: Reflector,
  ) {
    this.appOrigin = new URL(env.APP_URL).origin;
    this.adminOrigin = env.ADMIN_URL ? new URL(env.ADMIN_URL).origin : null;
    this.businessOrigin = env.BUSINESS_URL ? new URL(env.BUSINESS_URL).origin : null;
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    if (this.reflector.get<boolean>(ALLOW_CROSS_ORIGIN, context.getHandler())) return true;
    // Jeton d'API (agent IA, CI) : un navigateur ne l'envoie pas de lui-même, pas de CSRF possible.
    // Sans jeton ni cookie, rien à détourner non plus : la route répondra 401 (auth.required).
    // SessionOrTokenGuard authentifie ensuite, en ignorant le cookie s'il y a un jeton.
    if (
      (bearerToken(req) !== null || !readCookie(req, SESSION_COOKIE)) &&
      this.reflector.getAllAndOverride<boolean>(ALLOW_API_TOKEN, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    if (isAdminPath(req.path)) {
      if (
        this.adminOrigin &&
        req.headers.origin === this.adminOrigin &&
        req.headers['x-devhub-client'] === 'admin'
      )
        return true;
      // Rien ne doit révéler l'existence de l'administration : même réponse qu'une route absente.
      throw new NotFoundException({ code: 'not_found', title: 'Not found' });
    }
    if (isBusinessPath(req.path)) {
      if (
        this.businessOrigin &&
        req.headers.origin === this.businessOrigin &&
        req.headers['x-devhub-client'] === 'business'
      )
        return true;
      throw new NotFoundException({ code: 'not_found', title: 'Not found' });
    }
    if (req.headers.origin === this.appOrigin && req.headers['x-devhub-client'] === 'web')
      return true;
    throw new ForbiddenException({ code: 'csrf.origin_rejected', title: 'Origin not allowed' });
  }
}

/** Routes de l'espace d'administration (apps/admin). */
export const isAdminPath = (path: string): boolean =>
  path === '/api/v1/admin' || path.startsWith('/api/v1/admin/');

/** Routes du portail entreprise (apps/business). */
export const isBusinessPath = (path: string): boolean =>
  path === '/api/v1/business' || path.startsWith('/api/v1/business/');
