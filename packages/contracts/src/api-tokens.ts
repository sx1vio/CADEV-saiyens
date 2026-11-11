import { z } from 'zod';

// Jetons d'API personnels : l'agent IA (serveur MCP) et la CI (action GitHub) du développeur
// agissent en son nom. Portée « preflight » : routes du pré-vol seulement. Portée « platform »
// (11/11/2026) : toute l'API, sauf la gestion du compte, des jetons, l'administration et le
// portail entreprise ; c'est elle qu'utilisent les outils plateforme du serveur MCP.

export const API_TOKEN_PREFIX = 'dh_pat_';
/** Jetons actifs par personne. */
export const MAX_API_TOKENS = 5;

export const ApiTokenScope = z.enum(['preflight', 'platform']);
export type ApiTokenScope = z.infer<typeof ApiTokenScope>;

export const ApiTokenItem = z.object({
  id: z.uuid(),
  name: z.string(),
  /** Quatre derniers caractères, pour reconnaître le jeton sans l'exposer. */
  hint: z.string(),
  scope: ApiTokenScope,
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime().nullable(),
});
export type ApiTokenItem = z.infer<typeof ApiTokenItem>;

export const ListApiTokensResponse = z.object({ items: z.array(ApiTokenItem) });
export type ListApiTokensResponse = z.infer<typeof ListApiTokensResponse>;

export const CreateApiTokenRequest = z.object({
  name: z.string().trim().min(1).max(60),
  scope: ApiTokenScope.default('preflight'),
});
export type CreateApiTokenRequest = z.infer<typeof CreateApiTokenRequest>;

/** Le jeton en clair n'est renvoyé qu'une fois, à la création. */
export const CreateApiTokenResponse = ApiTokenItem.extend({ token: z.string() });
export type CreateApiTokenResponse = z.infer<typeof CreateApiTokenResponse>;
