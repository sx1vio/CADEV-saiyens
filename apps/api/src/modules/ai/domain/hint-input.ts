import { createHash } from 'node:crypto';
import { maskSecrets } from '@devhub/core';
import type { HintQuestion } from './ports';

// Limites de taille envoyées au modèle : une question SOS Dev tient largement dedans,
// et elles plafonnent le coût d'un appel (§8).
export const HINT_INPUT_LIMITS = { title: 150, body: 6_000, code: 6_000 } as const;

export interface HintInput {
  title: string;
  body: string;
  code: string | null;
  tags: string[];
  lang: 'fr' | 'en';
  /** Nombre de secrets masqués avant l'envoi (journalisé, jamais leur valeur). */
  maskedSecrets: number;
}

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}\n[… tronqué]` : text;

/**
 * Prépare l'entrée de la piste IA : secrets masqués (§6.1, correctif O9, même si le client
 * l'a déjà fait), espaces normalisés, tailles plafonnées, étiquettes triées.
 */
export function prepareHintInput(question: HintQuestion): HintInput {
  let maskedSecrets = 0;
  const mask = (text: string) => {
    const result = maskSecrets(text);
    maskedSecrets += result.count;
    return result.text;
  };
  const normalize = (text: string) => text.replace(/\r\n?/g, '\n').trim();

  const code = question.codeSnippet ? normalize(question.codeSnippet) : '';
  return {
    title: clip(mask(normalize(question.title)), HINT_INPUT_LIMITS.title),
    body: clip(mask(normalize(question.body)), HINT_INPUT_LIMITS.body),
    code: code ? clip(mask(code), HINT_INPUT_LIMITS.code) : null,
    tags: [...new Set(question.tags.map((t) => t.trim().toLowerCase()))].sort(),
    lang: question.lang,
    maskedSecrets,
  };
}

/** Empreinte du cache (§8) : deux questions identiques ne coûtent qu'un appel. */
export function hintInputHash(input: HintInput): string {
  const canonical = JSON.stringify([input.lang, input.tags, input.title, input.body, input.code]);
  return createHash('sha256').update(canonical).digest('hex');
}
