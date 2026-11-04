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
import { PrismaApiTokenStore } from '../infrastructure/prisma-api-token.store';
import { type AuthenticatedUser, SessionGuard } from './session.guard';

export const ALLOW_API_TOKEN = 'devhub:allow-api-token';

/** Jeton porté par « Authorization: Bearer … », s'il y en a un. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1]! : '';
}

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
    if (token === null) return this.session.canActivate(context);
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
