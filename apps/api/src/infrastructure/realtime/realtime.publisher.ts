import type { Prisma } from '../../generated/prisma/client';

// Publication des événements temps réel (ADR-0007, docs/architecture/07-taches-fond-temps-reel.md).
// `pg_notify` exécuté dans une transaction n'est délivré qu'au COMMIT : jamais d'événement pour
// une action annulée. Le message ne transporte que des identifiants (limite de 8 Ko).

export const USER_CHANNEL = 'devhub_events';
export const PUBLIC_CHANNEL = 'devhub_public';

type Db = Pick<Prisma.TransactionClient, '$executeRaw'>;

/** Des notifications viennent d'être créées pour ces utilisateurs. */
export async function publishToUsers(db: Db, userIds: string[]): Promise<void> {
  for (const u of new Set(userIds)) {
    await db.$executeRaw`SELECT pg_notify(${USER_CHANNEL}, ${JSON.stringify({ u })})`;
  }
}

export type PublicEvent =
  | 'question.ai_hint'
  | 'question.matched'
  | 'answer.created'
  | 'answer.accepted'
  | 'task.updated'
  | 'room_message.created'
  | 'content.hidden';

/** Événement public sur un sujet (« question:<id> », « room:<id> ») : les pages ouvertes se rafraîchissent. */
export async function publishToTopic(
  db: Db,
  topic: string,
  event: PublicEvent,
  data: Record<string, string>,
): Promise<void> {
  await db.$executeRaw`SELECT pg_notify(${PUBLIC_CHANNEL}, ${JSON.stringify({ t: topic, e: event, d: data })})`;
}
