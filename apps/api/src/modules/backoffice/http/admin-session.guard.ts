import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { inCidr } from '@devhub/core';
import { hashSessionToken, readCookie } from '../../identity';
import { type ActiveAdminSession, AdminSessionStore } from '../infrastructure/admin-session.store';

/** Cookie de l'application d'administration, posé seulement sur son origine (préfixe __Host-). */
export const ADMIN_COOKIE = '__Host-dh-adm';

export type AdminRequest = Request & {
  auth?: { userId: string; sessionIdHash: string };
  admin?: ActiveAdminSession;
};

/** Même réponse qu'une route qui n'existe pas : rien ne doit révéler l'administration. */
export const hidden = () => new NotFoundException({ code: 'not_found', title: 'Not found' });

/**
 * Contrôles d'accès communs à toutes les routes /api/v1/admin/* (connexion comprise) :
 * administration activée, IP autorisée, requête venue de l'application d'administration.
 */
export function assertAdminChannel(req: Request, env: Env): void {
  if (!env.ADMIN_URL) throw hidden();
  if (env.ADMIN_ALLOWED_IPS.length && !env.ADMIN_ALLOWED_IPS.some((r) => inCidr(req.ip ?? '', r)))
    throw hidden();
  // L'application d'administration envoie toujours cet en-tête ; une page d'une autre origine ne
  // peut pas l'ajouter sans pré-vérification CORS, refusée pour ces routes.
  if (req.headers['x-devhub-client'] !== 'admin') throw hidden();
  const origin = req.headers.origin;
  if (origin && origin !== new URL(env.ADMIN_URL).origin) throw hidden();
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') throw hidden();
}

/** Exige une session d'administration valide (double facteur). Sinon : 404. */
@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly sessions: AdminSessionStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    assertAdminChannel(req, this.env);
    const token = readCookie(req, ADMIN_COOKIE);
    if (!token) throw hidden();
    const session = await this.sessions.use(hashSessionToken(token), new Date());
    if (!session) throw hidden();
    req.admin = session;
    // Compatible avec @CurrentUser() des contrôleurs existants (modération).
    req.auth = { userId: session.userId, sessionIdHash: session.idHash };
    return true;
  }
}
