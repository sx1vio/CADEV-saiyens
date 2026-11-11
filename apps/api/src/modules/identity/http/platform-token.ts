import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { API_TOKEN_PREFIX } from '@devhub/contracts';
import type { PrismaApiTokenStore } from '../infrastructure/prisma-api-token.store';
import { bearerToken } from './bearer';
import { isAdminPath, isBusinessPath } from './paths';
import type { AuthenticatedUser } from './session.guard';

// Jetons d'API de portée « platform » (11/11/2026) : l'agent IA du développeur (serveur MCP) ou
// ses scripts agissent en son nom sur toute l'API, sauf ce qui touche au compte lui-même.
// La liste est centrale (et non un décorateur par route) : une route oubliée reste fermée
// au jeton seulement si elle est ici, donc on ferme par préfixe ce qui est sensible.

/** Préfixes jamais ouverts à un jeton : connexion, jetons, administration, portail entreprise. */
const DENIED_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/me/tokens',
  '/api/v1/admin',
  '/api/v1/business',
  // Protocole interne de l'application mobile (file hors ligne) et flux SSE du navigateur.
  '/api/v1/sync',
  '/api/v1/events',
];

/** Une route est-elle ouverte à un jeton « platform » ? */
export function platformTokenAllowed(method: string, path: string): boolean {
  const p = path.replace(/\/+$/, '') || '/';
  if (isAdminPath(p) || isBusinessPath(p)) return false;
  if (DENIED_PREFIXES.some((d) => p === d || p.startsWith(`${d}/`))) return false;
  // Suppression du compte : jamais par un jeton.
  if (method.toUpperCase() === 'DELETE' && p === '/api/v1/me') return false;
  return true;
}

/** Le Bearer de la requête est-il un jeton d'API personnel (dh_pat_…) ? */
export function hasApiToken(req: Request): boolean {
  const token = bearerToken(req);
  return !!token && token.startsWith(API_TOKEN_PREFIX);
}

/**
 * Authentifie un jeton d'API sur une route « Connecté » ordinaire : il doit exister, être de
 * portée « platform » et la route doit lui être ouverte. Lève une erreur explicite sinon.
 */
export async function authenticatePlatformToken(
  req: Request,
  tokens: PrismaApiTokenStore,
): Promise<AuthenticatedUser> {
  const token = bearerToken(req) ?? '';
  const found = await tokens.findActive(token, new Date());
  if (!found) {
    throw new UnauthorizedException({
      code: 'auth.invalid_token',
      title: 'Invalid or revoked API token',
    });
  }
  if (found.scope !== 'platform') {
    throw new ForbiddenException({
      code: 'auth.token_scope',
      title: 'This API token only opens the pre-flight routes; create a « platform » token',
    });
  }
  if (!platformTokenAllowed(req.method, req.path)) {
    throw new ForbiddenException({
      code: 'auth.token_forbidden_route',
      title: 'API tokens cannot use this route',
    });
  }
  return { userId: found.userId, sessionIdHash: `api-token:${found.id}`, tokenScope: 'platform' };
}
