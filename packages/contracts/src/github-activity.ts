import { z } from 'zod';

// Activité GitHub publique d'un membre, affichée sur son Passport.
// GET /api/v1/users/:handle/github : données publiques seulement (aucun dépôt privé).

export const GithubRepoCard = z.object({
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stars: z.number().int(),
  forks: z.number().int(),
  pushedAt: z.iso.datetime().nullable(),
  url: z.string(),
  homepage: z.string().nullable(),
  topics: z.array(z.string()),
});
export type GithubRepoCard = z.infer<typeof GithubRepoCard>;

export const GithubCommitItem = z.object({
  repo: z.string(),
  sha: z.string(),
  message: z.string(),
  url: z.string(),
  at: z.iso.datetime(),
});
export type GithubCommitItem = z.infer<typeof GithubCommitItem>;

export const GithubEventKind = z.enum([
  'push',
  'pr',
  'issue',
  'release',
  'create',
  'review',
  'fork',
  'star',
]);
export type GithubEventKind = z.infer<typeof GithubEventKind>;

export const GithubEventItem = z.object({
  kind: GithubEventKind,
  repo: z.string(),
  label: z.string(),
  url: z.string(),
  at: z.iso.datetime(),
});
export type GithubEventItem = z.infer<typeof GithubEventItem>;

export const GithubActivityView = z.object({
  profile: z.object({
    login: z.string(),
    url: z.string(),
    followers: z.number().int(),
    following: z.number().int(),
    publicRepos: z.number().int(),
    since: z.iso.datetime(),
  }),
  totals: z.object({
    stars: z.number().int(),
    forks: z.number().int(),
    /** Événements publics des 90 derniers jours (limite de l'API GitHub) */
    events90d: z.number().int(),
    commits90d: z.number().int(),
  }),
  languages: z.array(z.object({ name: z.string(), repos: z.number().int() })),
  repos: z.array(GithubRepoCard),
  commits: z.array(GithubCommitItem),
  events: z.array(GithubEventItem),
  /** 91 jours, du plus ancien au plus récent : nombre d'événements publics par jour */
  calendar: z.array(z.object({ date: z.string(), count: z.number().int() })),
  fetchedAt: z.iso.datetime(),
});
export type GithubActivityView = z.infer<typeof GithubActivityView>;
