import { createHash } from 'node:crypto';
import { maskSecrets } from '@devhub/core';
import type { TranslatedText, TranslationSource } from './ports';

/** Bloc de code clôturé (``` ou ~~~) : jamais envoyé au modèle, donc jamais traduit. */
const CODE_FENCE = /(```|~~~)[\s\S]*?\1/g;
const placeholder = (index: number) => `[[CODE_${index}]]`;
const PLACEHOLDER = /\[\[CODE_(\d+)\]\]/g;

export interface TranslationInput extends TranslatedText {
  target: 'fr' | 'en';
  /** Blocs de code retirés du corps, remis à leur place après la traduction. */
  codeBlocks: string[];
  /** Nombre de secrets masqués avant l'envoi (journalisé, jamais leur valeur). */
  maskedSecrets: number;
}

/**
 * Prépare l'entrée de la traduction : secrets masqués (§6.1, O9), espaces normalisés, blocs de
 * code remplacés par des repères [[CODE_n]] pour que le code reste intact (09-ia-integrations).
 */
export function prepareTranslationInput(
  source: TranslationSource,
  target: 'fr' | 'en',
): TranslationInput {
  let maskedSecrets = 0;
  const mask = (text: string) => {
    const result = maskSecrets(text);
    maskedSecrets += result.count;
    return result.text;
  };
  const normalize = (text: string) => text.replace(/\r\n?/g, '\n').trim();

  const codeBlocks: string[] = [];
  const body = mask(normalize(source.body)).replace(CODE_FENCE, (block) => {
    codeBlocks.push(block);
    return placeholder(codeBlocks.length);
  });
  return {
    title: source.title === null ? null : mask(normalize(source.title)),
    body,
    target,
    codeBlocks,
    maskedSecrets,
  };
}

/** Remet les blocs de code ; un bloc que le modèle aurait perdu est ajouté à la fin. */
export function restoreCode(body: string, codeBlocks: string[]): string {
  const used = new Set<number>();
  const restored = body.replace(PLACEHOLDER, (match, n: string) => {
    const index = Number(n);
    const block = codeBlocks[index - 1];
    if (block === undefined) return match;
    used.add(index);
    return block;
  });
  const missing = codeBlocks.filter((_, i) => !used.has(i + 1));
  return missing.length ? `${restored}\n\n${missing.join('\n\n')}` : restored;
}

const sha256 = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Empreinte du texte source et du gabarit : une traduction enregistrée est périmée dès que
 * l'original change, ou quand le gabarit (ou le faux modèle) qui l'a produite n'est plus utilisé.
 */
export function sourceHash(input: TranslationInput, promptVer: string): string {
  return sha256([promptVer, input.title, input.body, input.codeBlocks]);
}

/** Empreinte du cache (§8) : deux textes identiques vers la même langue ne coûtent qu'un appel. */
export function translationInputHash(input: TranslationInput): string {
  return sha256([input.target, input.title, input.body]);
}
