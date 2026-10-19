import { maskSecrets } from '@/lib/detect';
import type { OfflineAction } from '@/services/types';

const mask = (text: string) => maskSecrets(text).text;
const maskOptional = (text: string | undefined) => (text === undefined ? text : mask(text));

/**
 * O9 : les secrets sont masqués avant d'être écrits sur l'appareil. Chaque champ texte saisi
 * passe par `maskSecrets`, titre et champs facultatifs compris (BUG-040).
 */
export function sanitize(a: OfflineAction): OfflineAction {
  if (a.type === 'question')
    return {
      ...a,
      payload: {
        ...a.payload,
        title: mask(a.payload.title),
        body: mask(a.payload.body),
        tried: maskOptional(a.payload.tried),
        expected: maskOptional(a.payload.expected),
        environment: maskOptional(a.payload.environment),
        codeSnippet: mask(a.payload.codeSnippet),
        reproUrl: maskOptional(a.payload.reproUrl),
      },
    };
  if (a.type === 'answer') return { ...a, payload: { ...a.payload, body: mask(a.payload.body) } };
  if (a.type === 'message' || a.type === 'edit-answer')
    return {
      ...a,
      payload: { ...a.payload, body: mask(a.payload.body) },
    } as OfflineAction;
  if (a.type === 'edit-question')
    return {
      ...a,
      payload: {
        ...a.payload,
        title: mask(a.payload.title),
        body: mask(a.payload.body),
        codeSnippet: mask(a.payload.codeSnippet),
      },
    };
  return a;
}
