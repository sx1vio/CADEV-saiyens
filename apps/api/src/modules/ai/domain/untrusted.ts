import type { UntrustedInput } from './ports';

/**
 * Encadre le contenu utilisateur avant l'envoi au modèle (correctif M2). Une balise
 * <user_content> ou </user_content> écrite par l'utilisateur est neutralisée : il ne peut pas
 * « sortir » de son cadre pour se faire passer pour une instruction.
 */
export function renderUntrusted(parts: UntrustedInput[]): string {
  const neutralize = (text: string) =>
    text.replace(/<(\/?)\s*user_content/gi, '&lt;$1user_content');
  return parts
    .map((p) => `<user_content label="${p.label}">\n${neutralize(p.text)}\n</user_content>`)
    .join('\n\n');
}
