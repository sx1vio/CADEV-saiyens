import { z } from 'zod';

// Espace d'administration : application à part (apps/admin), session à part, double facteur.
// Toutes les routes /api/v1/admin/* répondent 404 sans session d'administration valide.

/** POST /api/v1/admin/session : e-mail, mot de passe et code à 6 chiffres de l'application d'authentification. */
export const AdminLoginRequest = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(200),
  code: z.string().regex(/^\d{6}$/),
});
export type AdminLoginRequest = z.infer<typeof AdminLoginRequest>;

/** GET /api/v1/admin/session */
export const AdminSessionView = z.object({
  handle: z.string(),
  displayName: z.string(),
  expiresAt: z.iso.datetime(),
});
export type AdminSessionView = z.infer<typeof AdminSessionView>;

/** GET /api/v1/admin/overview : chiffres réels de la plateforme. */
export const AdminOverview = z.object({
  users: z.number().int(),
  newUsers7d: z.number().int(),
  questions: z.number().int(),
  answers: z.number().int(),
  rooms: z.number().int(),
  openReports: z.number().int(),
  publishedJobs: z.number().int(),
  draftJobs: z.number().int(),
});
export type AdminOverview = z.infer<typeof AdminOverview>;
