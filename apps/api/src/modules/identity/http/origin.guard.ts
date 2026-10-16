import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ALLOW_CROSS_ORIGIN = 'devhub:allow-cross-origin';

/**
 * Écriture appelable hors de l'application, sans cookie ni en-tête maison : réservée aux routes
 * dont un jeton signé fait la preuve (désabonnement en un clic, RFC 8058). À n'utiliser que là.
 */
export const AllowCrossOrigin = () => SetMetadata(ALLOW_CROSS_ORIGIN, true);

// Protection CSRF des écritures (docs/architecture/10-securite.md) : en plus de SameSite=Lax,
// toute requête qui modifie l'état doit venir de l'origine de l'application et porter X-DevHub-Client: web.
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly appOrigin: string;

  constructor(
    @Inject(ENV) env: Env,
    private readonly reflector: Reflector,
  ) {
    this.appOrigin = new URL(env.APP_URL).origin;
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    if (this.reflector.get<boolean>(ALLOW_CROSS_ORIGIN, context.getHandler())) return true;
    if (req.headers.origin === this.appOrigin && req.headers['x-devhub-client'] === 'web')
      return true;
    throw new ForbiddenException({ code: 'csrf.origin_rejected', title: 'Origin not allowed' });
  }
}
