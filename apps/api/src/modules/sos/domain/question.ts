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
  /** S14 : lien de reproduction, déjà validé par le contrat (HTTPS, liste blanche). */
  reproUrl?: string | null;
}

/**
 * S14 : un lien de reproduction qui porte un secret (jeton en paramètre, par exemple) perd sa
 * requête et son ancre ; si le chemin lui-même en contient un, le lien est retiré.
 */
export function maskReproUrl(url: string | null | undefined): {
  url: string | null;
  count: number;
} {
  if (!url) return { url: null, count: 0 };
  const found = maskSecrets(url).count;
  if (found === 0) return { url, count: 0 };
  const { origin, pathname } = new URL(url);
  const stripped = `${origin}${pathname}`;
  return { url: maskSecrets(stripped).count === 0 ? stripped : null, count: found };
}

/**
 * §6.1 et correctif O9 : les secrets repérés par motif sont masqués avant tout stockage, même si
 * le client l'a déjà fait (même règle que le front, `maskSecrets` de @devhub/core).
 */
export function maskDraft(draft: QuestionDraft): { draft: QuestionDraft; secretsMasked: number } {
  const title = maskSecrets(draft.title);
  const body = maskSecrets(draft.body);
  const code = draft.codeSnippet?.trim() ? maskSecrets(draft.codeSnippet) : null;
  const repro = maskReproUrl(draft.reproUrl);
  return {
    draft: {
      title: title.text,
      body: body.text,
      codeSnippet: code?.text ?? null,
      reproUrl: repro.url,
    },
    secretsMasked: title.count + body.count + (code?.count ?? 0) + repro.count,
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
