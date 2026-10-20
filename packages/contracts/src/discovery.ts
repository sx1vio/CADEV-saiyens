import { z } from 'zod';
import { QuestionTag } from './questions';
import { PageInfo } from './xp';

// Découverte (D1) et classement par pays (D2).

const flag = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

/** GET /api/v1/discover/devs : filtres combinables ; les profils non listés n'apparaissent pas. */
export const DiscoverDevsQuery = z.object({
  tag: z.string().trim().toLowerCase().max(40).optional(),
  /** Décalage UTC visé en heures (ex. 0 pour Abidjan) ; tolérance de ± 3 h. */
  tz: z.coerce.number().int().min(-12).max(14).optional(),
  available: flag,
  /** PR4 : seulement les devs « Disponible pour une mission ». */
  mission: flag,
  lookingFor: z.string().trim().min(2).max(100).optional(),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type DiscoverDevsQuery = z.infer<typeof DiscoverDevsQuery>;

export const DevCard = z.object({
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  country: z.string().nullable(),
  timezone: z.string().nullable(),
  lookingFor: z.string().nullable(),
  isDemo: z.boolean(),
  totalXp: z.number().int(),
  availableNow: z.boolean(),
  availableForMission: z.boolean(),
  topSkills: z.array(QuestionTag.extend({ score: z.number().int() })),
  canHelp: z.array(QuestionTag),
});
export type DevCard = z.infer<typeof DevCard>;

export const DiscoverDevsResponse = z.object({ data: z.array(DevCard), page: PageInfo });
export type DiscoverDevsResponse = z.infer<typeof DiscoverDevsResponse>;

/** GET /api/v1/leaderboard : par pays (D2), ou les devs d'un pays. Calcul : somme du journal XP. */
export const LeaderboardQuery = z.object({
  scope: z.enum(['country', 'devs']).default('country'),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type LeaderboardQuery = z.infer<typeof LeaderboardQuery>;

export const LeaderboardResponse = z.object({
  scope: z.enum(['country', 'devs']),
  /** Méthode affichée telle quelle sur /classement (« calcul transparent »). */
  method: z.string(),
  countries: z.array(
    z.object({
      country: z.string(),
      totalXp: z.number().int(),
      devs: z.number().int(),
      rank: z.number().int(),
    }),
  ),
  devs: z.array(
    z.object({
      handle: z.string(),
      displayName: z.string(),
      country: z.string().nullable(),
      totalXp: z.number().int(),
      rank: z.number().int(),
      isDemo: z.boolean(),
    }),
  ),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponse>;
