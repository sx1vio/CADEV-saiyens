import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SESSION_TTL_MS, hashSessionToken } from '../application/session-token';
import { PrismaSessionStore } from '../infrastructure/prisma-session.store';
import { SESSION_COOKIE, baseCookie, readCookie } from './cookies';

export interface AuthenticatedUser {
  userId: string;
  sessionIdHash: string;
}

type AuthenticatedRequest = Request & { auth?: AuthenticatedUser };

const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000; // on prolonge au plus une fois par jour

/** Exige une session valide (cookie __Host-sid) ; à poser sur les routes « Connecté ». */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: PrismaSessionStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) throw unauthorized();

    const now = new Date();
    const session = await this.sessions.findActive(hashSessionToken(token), now);
    if (!session) throw unauthorized();

    if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
      await this.sessions.touch(session, now, expiresAt);
      context
        .switchToHttp()
        .getResponse<Response>()
        .cookie(SESSION_COOKIE, token, { ...baseCookie, expires: expiresAt });
    }

    req.auth = { userId: session.userId, sessionIdHash: session.idHash };
    return true;
  }
}

/**
 * Lit la session si elle existe, sans l'exiger : routes publiques dont la réponse dépend du
 * visiteur (« mes questions »). Ne prolonge pas la session.
 */
@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(private readonly sessions: PrismaSessionStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return true;
    const session = await this.sessions.findActive(hashSessionToken(token), new Date());
    if (session) req.auth = { userId: session.userId, sessionIdHash: session.idHash };
    return true;
  }
}

function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({ code: 'auth.required', title: 'Authentication required' });
}

/** Utilisateur connecté, disponible après SessionGuard. */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser => {
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!auth) throw unauthorized();
    return auth;
  },
);

/** Utilisateur connecté s'il y en a un (après OptionalSessionGuard), sinon null. */
export const OptionalUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser | null =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth ?? null,
);
