import { z } from 'zod';
import { PublicAuthor } from './questions';

// S5 : créneau de pair programming proposé par un aidant à l'auteur d'une question.
// Le créneau et le lien de visio ne sont visibles que des deux personnes concernées.

/** Services de visio acceptés (sous-domaines compris : us02web.zoom.us, equipe.whereby.com). */
export const PAIR_VIDEO_HOSTS = [
  'meet.google.com',
  'meet.jit.si',
  'zoom.us',
  'teams.microsoft.com',
  'whereby.com',
] as const;

/**
 * Lien https vers un service de visio connu, avec un chemin (la salle). Sans port ni
 * identifiants : l'hôte n'accepte que lettres, chiffres, points et tirets.
 */
export function isAllowedVideoLink(link: string): boolean {
  const match = /^https:\/\/([a-z0-9.-]+)(\/\S*)$/i.exec(link.trim());
  if (!match) return false;
  const host = match[1]!.toLowerCase();
  const path = match[2]!;
  const known = PAIR_VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  return known && path.length > 1;
}

export const PAIR_LIMITS = {
  /** Un créneau se propose au plus 30 jours à l'avance. */
  maxDaysAhead: 30,
  /** Tolérance d'horloge : un créneau « maintenant » saisi il y a peu reste accepté. */
  pastToleranceMinutes: 5,
  /** Après un refus, le même aidant attend 24 h avant de reproposer sur la même question. */
  declineCooldownHours: 24,
  videoLinkMax: 300,
} as const;

/** POST /api/v1/questions/:id/pair */
export const ProposePairRequest = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  videoLink: z.string().trim().max(PAIR_LIMITS.videoLinkMax),
});
export type ProposePairRequest = z.infer<typeof ProposePairRequest>;

/** POST /api/v1/pair-sessions/:id/respond */
export const RespondPairRequest = z.object({ accept: z.boolean() });
export type RespondPairRequest = z.infer<typeof RespondPairRequest>;

export const PairSessionStatus = z.enum(['proposed', 'accepted', 'declined', 'done', 'cancelled']);
export type PairSessionStatus = z.infer<typeof PairSessionStatus>;

export const PairSessionView = z.object({
  id: z.uuid(),
  questionId: z.uuid(),
  /** Aidant qui propose. */
  host: PublicAuthor,
  /** Auteur de la question. */
  guest: PublicAuthor,
  startsAt: z.iso.datetime(),
  videoLink: z.string(),
  status: PairSessionStatus,
  createdAt: z.iso.datetime(),
});
export type PairSessionView = z.infer<typeof PairSessionView>;

/** GET /api/v1/questions/:id/pair-sessions : seulement les sessions où l'on est hôte ou invité. */
export const ListPairSessionsResponse = z.object({ data: z.array(PairSessionView) });
export type ListPairSessionsResponse = z.infer<typeof ListPairSessionsResponse>;
