import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SESSION_TTL_MS, hashSessionToken } from '../application/session-token';
import { API_TOKEN_PREFIX, type ApiTokenScope } from '@devhub/contracts';
import { PrismaApiTokenStore } from '../infrastructure/prisma-api-token.store';
import { PrismaSessionStore } from '../infrastructure/prisma-session.store';
import { bearerToken } from './bearer';
import { SESSION_COOKIE, baseCookie, readCookie } from './cookies';
import { authenticatePlatformToken, hasApiToken } from './platform-token';

export interface AuthenticatedUser {
  userId: string;
  sessionIdHash: string;
  /** Requête portée par un jeton d'API personnel (absent pour une session). */
  tokenScope?: ApiTokenScope;
}

type AuthenticatedRequest = Request & { auth?: AuthenticatedUser };

const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000; // on prolonge au plus une fois par jour

/**
 * Jeton de session de la requête. Navigateur : cookie __Host-sid. Application mobile
 * (ADR-0021) : « Authorization: Bearer <jeton> » ; si l'en-tête est présent, lui seul compte.
 * Un jeton d'API personnel (dh_pat_…) n'est pas une session : SessionOrTokenGuard s'en charge.
 */
export function readSessionToken(
  req: Request,
): { token: string; from: 'cookie' | 'bearer' } | null {
  const bearer = bearerToken(req);
  if (bearer !== null) {
    return bearer && !bearer.startsWith(API_TOKEN_PREFIX)
      ? { token: bearer, from: 'bearer' }
      : null;
  }
  const cookie = readCookie(req, SESSION_COOKIE);
  return cookie ? { token: cookie, from: 'cookie' } : null;
}

/** Exige une session valide (cookie ou Bearer) ; à poser sur les routes « Connecté ». */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: PrismaSessionStore,
    private readonly tokens: PrismaApiTokenStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Jeton d'API « platform » (agent IA, scripts) : au nom de son titulaire, hors routes du compte.
    if (hasApiToken(req)) {
      req.auth = await authenticatePlatformToken(req, this.tokens);
      return true;
    }
    const found = readSessionToken(req);
    if (!found) throw unauthorized();

    const now = new Date();
    const session = await this.sessions.findActive(hashSessionToken(found.token), now);
    if (!session) throw unauthorized();

    if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
      await this.sessions.touch(session, now, expiresAt);
      // Le mobile garde son jeton : seule l'expiration côté serveur glisse.
      if (found.from === 'cookie')
        context
          .switchToHttp()
          .getResponse<Response>()
          .cookie(SESSION_COOKIE, found.token, { ...baseCookie, expires: expiresAt });
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
  constructor(
    private readonly sessions: PrismaSessionStore,
    private readonly tokens: PrismaApiTokenStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (hasApiToken(req)) {
      req.auth = await authenticatePlatformToken(req, this.tokens);
      return true;
    }
    const found = readSessionToken(req);
    if (!found) return true;
    const session = await this.sessions.findActive(hashSessionToken(found.token), new Date());
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
