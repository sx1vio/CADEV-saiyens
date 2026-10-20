// PR4 : « Contacter » depuis un Passport. Règles pures, sans base de données.

/** Messages envoyés au plus par une personne sur 24 heures glissantes (anti-spam). */
export const CONTACTS_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 0 si un nouveau message peut partir ; sinon le nombre de secondes à attendre. */
export function contactRetryAfter(sentAt: Date[], now: Date): number {
  const recent = sentAt
    .filter((d) => now.getTime() - d.getTime() < DAY_MS)
    .sort((a, b) => a.getTime() - b.getTime());
  if (recent.length < CONTACTS_PER_DAY) return 0;
  const freeAt = recent[recent.length - CONTACTS_PER_DAY]!.getTime() + DAY_MS;
  return Math.max(1, Math.ceil((freeAt - now.getTime()) / 1000));
}
