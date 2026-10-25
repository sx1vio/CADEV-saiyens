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
