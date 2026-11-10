import type { NextFunction, Request, Response } from 'express';

// Réponses authentifiées jamais gardées par un cache (navigateur, proxy, CDN) : recette du
// 10/11/2026, SEC-04 (ASVS V14, données sensibles en cache). Une route qui pose elle-même son
// Cache-Control (actualités publiques, images) garde le sien : il est écrit après ce middleware.

const SESSION_COOKIES = ['__Host-sid=', '__Host-dh-biz=', '__Host-dh-adm='];
/** Toujours personnelles, avec ou sans session : profil, réglages, administration, espace entreprise. */
const PRIVATE_PREFIXES = ['/api/v1/me', '/api/v1/admin', '/api/v1/business'];

export function isPrivateRequest(path: string, cookie: string | undefined, auth: unknown): boolean {
  if (!path.startsWith('/api/')) return false;
  if (PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return true;
  if (typeof auth === 'string' && auth.length > 0) return true;
  return !!cookie && SESSION_COOKIES.some((c) => cookie.includes(c));
}

export function privateCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = (req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';
  if (isPrivateRequest(path, req.headers.cookie, req.headers.authorization)) {
    res.setHeader('Cache-Control', 'private, no-store');
  }
  next();
}
