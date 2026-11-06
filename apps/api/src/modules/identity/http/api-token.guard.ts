import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { API_TOKEN_PREFIX } from '@devhub/contracts';
import { PrismaApiTokenStore } from '../infrastructure/prisma-api-token.store';
import { bearerToken } from './bearer';
import { type AuthenticatedUser, SessionGuard } from './session.guard';

export const ALLOW_API_TOKEN = 'devhub:allow-api-token';

export { bearerToken } from './bearer';

/**
 * Route « Connecté » qui accepte aussi un jeton d'API personnel (agent IA, CI).
 * Avec un en-tête Authorization, seul le jeton compte (le cookie est ignoré) ; une requête
 * portée par un jeton ne peut pas venir d'une page tierce (pas de CSRF), d'où l'exemption
 * accordée par OriginGuard à ces seules routes.
 */
@Injectable()
export class SessionOrTokenGuard implements CanActivate {
  constructor(
    private readonly tokens: PrismaApiTokenStore,
    private readonly session: SessionGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { auth?: AuthenticatedUser }>();
    const token = bearerToken(req);
    // Pas de jeton d'API : session (cookie, ou Bearer de l'application mobile).
    if (token === null || (token && !token.startsWith(API_TOKEN_PREFIX)))
      return this.session.canActivate(context);
    const found = token ? await this.tokens.findActive(token, new Date()) : null;
    if (!found) {
      throw new UnauthorizedException({
        code: 'auth.invalid_token',
        title: 'Invalid or revoked API token',
      });
    }
    req.auth = { userId: found.userId, sessionIdHash: `api-token:${found.id}` };
    return true;
  }
}

/** Session ou jeton d'API personnel ; à réserver aux routes du pré-vol. */
export const AllowApiToken = () =>
  applyDecorators(SetMetadata(ALLOW_API_TOKEN, true), UseGuards(SessionOrTokenGuard));
