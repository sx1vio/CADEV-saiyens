import type { CookieOptions, Request } from 'express';

// Cookies « __Host- » : Secure, Path=/, sans Domain (ADR-0009). Les navigateurs les acceptent aussi sur http://localhost.
export const SESSION_COOKIE = '__Host-sid';
export const OAUTH_STATE_COOKIE = '__Host-oauth';

export const baseCookie: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
};

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
