import { z } from 'zod';

/**
 * Compte par e-mail et mot de passe, à côté de l'OAuth GitHub (A1) : pour les débutants qui
 * n'ont pas encore de compte GitHub. POST /api/v1/auth/email/register et /login ouvrent la
 * session en cookie HttpOnly, comme le retour d'OAuth ; le front relit ensuite GET /me.
 */
const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const EmailRegisterRequest = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: Email,
    // 8 caractères au moins ; la limite haute borne le coût de scrypt
    password: z.string().min(8).max(200),
  })
  .strict();
export type EmailRegisterRequest = z.infer<typeof EmailRegisterRequest>;

export const EmailLoginRequest = z
  .object({
    email: Email,
    password: z.string().min(1).max(200),
  })
  .strict();
export type EmailLoginRequest = z.infer<typeof EmailLoginRequest>;

/**
 * Applications mobiles (ADR-0021). La connexion GitHub s'ouvre dans le navigateur système
 * (GET /api/v1/auth/github/mobile?challenge=…), puis revient dans l'application par
 * `devhub://auth/callback?code=…`. L'application échange ce code, avec le secret PKCE qu'elle
 * seule détient, contre un jeton de session porté ensuite par « Authorization: Bearer ».
 */
export const MOBILE_CLIENT = 'mobile';

const Base64Url = z.string().regex(/^[A-Za-z0-9_-]+$/);

export const MobileTokenRequest = z
  .object({
    code: Base64Url.min(16).max(2048),
    // RFC 7636 : 43 à 128 caractères
    codeVerifier: Base64Url.min(43).max(128),
  })
  .strict();
export type MobileTokenRequest = z.infer<typeof MobileTokenRequest>;

export const MobileTokenResponse = z.object({
  sessionToken: z.string(),
  expiresAt: z.iso.datetime(),
});
export type MobileTokenResponse = z.infer<typeof MobileTokenResponse>;
