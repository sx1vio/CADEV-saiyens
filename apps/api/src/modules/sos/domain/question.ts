import { maskSecrets } from '@devhub/core';

// Règles pures de SOS Dev (CDC v3 §6.1). Aucune dépendance à Nest ni à Prisma.

export class TooManyQuestionsError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Trop de questions sur la dernière heure');
  }
}

export class UnknownTagsError extends Error {
  constructor(readonly slugs: string[]) {
    super(`Étiquettes inconnues : ${slugs.join(', ')}`);
  }
}

export interface QuestionDraft {
  title: string;
  body: string;
  codeSnippet: string | null;
}

/**
 * §6.1 et correctif O9 : les secrets repérés par motif sont masqués avant tout stockage, même si
 * le client l'a déjà fait (même règle que le front, `maskSecrets` de @devhub/core).
 */
export function maskDraft(draft: QuestionDraft): { draft: QuestionDraft; secretsMasked: number } {
  const title = maskSecrets(draft.title);
  const body = maskSecrets(draft.body);
  const code = draft.codeSnippet?.trim() ? maskSecrets(draft.codeSnippet) : null;
  return {
    draft: { title: title.text, body: body.text, codeSnippet: code?.text ?? null },
    secretsMasked: title.count + body.count + (code?.count ?? 0),
  };
}

/**
 * Anti-spam : `limit` questions par fenêtre glissante d'une heure. Renvoie le délai avant la
 * prochaine question possible, ou 0 si l'utilisateur peut poser.
 */
export function retryAfterSeconds(recent: Date[], limit: number, now: Date): number {
  if (recent.length < limit) return 0;
  const sorted = [...recent].sort((a, b) => a.getTime() - b.getTime());
  const oldestCounted = sorted[sorted.length - limit]!;
  const freeAt = oldestCounted.getTime() + 60 * 60 * 1000;
  return Math.max(1, Math.ceil((freeAt - now.getTime()) / 1000));
}
