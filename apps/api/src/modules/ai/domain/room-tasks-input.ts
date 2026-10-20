import { createHash } from 'node:crypto';
import { maskSecrets } from '@devhub/core';

// Limites envoyées au modèle (§8) : les derniers messages seulement, chacun plafonné.
export const ROOM_TASKS_INPUT_LIMITS = { messages: 40, message: 1_000, existingTasks: 30 } as const;

export interface RoomDiscussion {
  /** Messages de la salle, du plus ancien au plus récent. */
  messages: string[];
  /** Titres des tâches déjà ouvertes, pour ne pas les proposer une seconde fois. */
  existingTasks: string[];
  lang: 'fr' | 'en';
}

export interface RoomTasksInput extends RoomDiscussion {
  /** Nombre de secrets masqués avant l'envoi (journalisé, jamais leur valeur). */
  maskedSecrets: number;
}

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)} [… tronqué]` : text;

/** Prépare la discussion : secrets masqués (§6.1, O9), espaces normalisés, tailles plafonnées. */
export function prepareRoomTasksInput(discussion: RoomDiscussion): RoomTasksInput {
  let maskedSecrets = 0;
  const clean = (text: string, max: number) => {
    const result = maskSecrets(text.replace(/\r\n?/g, '\n').trim());
    maskedSecrets += result.count;
    return clip(result.text, max);
  };
  const messages = discussion.messages
    .slice(-ROOM_TASKS_INPUT_LIMITS.messages)
    .map((m) => clean(m, ROOM_TASKS_INPUT_LIMITS.message))
    .filter(Boolean);
  const existingTasks = discussion.existingTasks
    .slice(0, ROOM_TASKS_INPUT_LIMITS.existingTasks)
    .map((t) => clean(t, 150));
  return { messages, existingTasks, lang: discussion.lang, maskedSecrets };
}

/** Empreinte du cache : la même discussion, dans la même langue, ne coûte qu'un appel. */
export function roomTasksInputHash(input: RoomTasksInput): string {
  const canonical = JSON.stringify([input.lang, input.messages, [...input.existingTasks].sort()]);
  return createHash('sha256').update(canonical).digest('hex');
}
