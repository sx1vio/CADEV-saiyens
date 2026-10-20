import { z } from 'zod';
import { Lang } from './questions';

// S10 : pont bilingue. Une question ou une réponse se lit dans l'autre langue (FR ↔ EN),
// traduite par l'IA à la demande et mise en cache par contenu et par langue.

export const TranslatableType = z.enum(['question', 'answer']);
export type TranslatableType = z.infer<typeof TranslatableType>;

/** POST /api/v1/questions/:id/translate?lang= et POST /api/v1/answers/:id/translate?lang= */
export const TranslateQuery = z.object({ lang: Lang });
export type TranslateQuery = z.infer<typeof TranslateQuery>;

/**
 * Traduction affichée avec la mention « Traduit automatiquement » ; l'original reste dans
 * GET /questions/:id. L'extrait de code et les blocs de code ne sont jamais traduits.
 */
export const TranslationResponse = z.object({
  contentType: TranslatableType,
  contentId: z.uuid(),
  lang: Lang,
  /** Titre traduit (question seulement). */
  title: z.string().nullable(),
  body: z.string(),
  /** Traduction déjà connue : aucun appel au modèle, rien de décompté du quota. */
  cached: z.boolean(),
  /** Faux modèle (aucune clé d'IA) : le texte n'est pas une vraie traduction. */
  demo: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type TranslationResponse = z.infer<typeof TranslationResponse>;
