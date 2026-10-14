// Règles pures des salles de projet (CDC v3 §5 : R1 à R9). Aucune dépendance à Nest ni à Prisma.

export class RoomNotFoundError extends Error {}
export class RepoNotFoundError extends Error {}
export class RepoPrivateError extends Error {}
export class GithubNotLinkedError extends Error {}
export class GithubUnavailableError extends Error {}
export class UnknownStackError extends Error {
  constructor(readonly slugs: string[]) {
    super(`Étiquettes inconnues : ${slugs.join(', ')}`);
  }
}
export class AlreadyMemberError extends Error {}
export class JoinRequestNotFoundError extends Error {}
/** Seul le créateur (ou un mainteneur) gère la salle. */
export class NotRoomManagerError extends Error {}
/** La demande a déjà été traitée. */
export class JoinRequestDecidedError extends Error {}

export type RoomRole = 'owner' | 'maintainer' | 'member';

export const canManage = (role: RoomRole | null): boolean =>
  role === 'owner' || role === 'maintainer';

/** Alphabet sans caractères ambigus (0/o, 1/l/i), lisible à voix haute et dans un lien. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Code d'invitation de l'URL publique /p/:code (R7) : 8 caractères, environ 40 bits. */
export function inviteCode(randomBytes: (n: number) => Uint8Array): string {
  return [...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}
