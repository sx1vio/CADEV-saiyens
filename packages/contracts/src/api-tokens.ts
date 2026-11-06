import { z } from 'zod';

// Jetons d'API personnels : l'agent IA (serveur MCP) et la CI (action GitHub) du développeur
// lancent un pré-vol en son nom. Ils ne donnent accès qu'aux routes du pré-vol.

export const API_TOKEN_PREFIX = 'dh_pat_';
/** Jetons actifs par personne. */
export const MAX_API_TOKENS = 5;

export const ApiTokenItem = z.object({
  id: z.uuid(),
  name: z.string(),
  /** Quatre derniers caractères, pour reconnaître le jeton sans l'exposer. */
  hint: z.string(),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime().nullable(),
});
export type ApiTokenItem = z.infer<typeof ApiTokenItem>;

export const ListApiTokensResponse = z.object({ items: z.array(ApiTokenItem) });
export type ListApiTokensResponse = z.infer<typeof ListApiTokensResponse>;

export const CreateApiTokenRequest = z.object({ name: z.string().trim().min(1).max(60) });
export type CreateApiTokenRequest = z.infer<typeof CreateApiTokenRequest>;

/** Le jeton en clair n'est renvoyé qu'une fois, à la création. */
export const CreateApiTokenResponse = ApiTokenItem.extend({ token: z.string() });
export type CreateApiTokenResponse = z.infer<typeof CreateApiTokenResponse>;
