import { z } from 'zod';
import { PublicAuthor, QuestionTag } from './questions';
import { PageInfo } from './xp';

// Salles de projet (docs/architecture/06-api.md#salles-de-projet-rooms) : R1 à R9.

export const RoomState = z.enum(['idea', 'in_progress', 'looking_for_help', 'shipped']);
export const RoomVisibility = z.enum(['public', 'unlisted']);
export const RoomRole = z.enum(['owner', 'maintainer', 'member']);
export const JoinRequestStatus = z.enum(['pending', 'accepted', 'refused', 'cancelled']);

export const ROOM_LIMITS = { nameMin: 3, nameMax: 80, descriptionMax: 5_000, stackMax: 8 } as const;

const httpsUrl = z.url({ protocol: /^https$/ }).max(300);

/** POST /api/v1/rooms (R1). Le dépôt est vérifié via l'API GitHub. */
export const CreateRoomRequest = z.object({
  name: z.string().trim().min(ROOM_LIMITS.nameMin).max(ROOM_LIMITS.nameMax),
  description: z.string().trim().min(10).max(ROOM_LIMITS.descriptionMax),
  state: RoomState.default('in_progress'),
  visibility: RoomVisibility.default('public'),
  /** « owner/repo » public. */
  repoFullName: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/)
    .nullish(),
  demoUrl: httpsUrl.nullish(),
  stackTagSlugs: z
    .array(z.string().trim().toLowerCase().min(1).max(40))
    .min(1)
    .max(ROOM_LIMITS.stackMax),
});
export type CreateRoomRequest = z.infer<typeof CreateRoomRequest>;

export const RoomMemberView = z.object({
  user: PublicAuthor,
  role: RoomRole,
  joinedAt: z.iso.datetime(),
});

export const RoomSummary = z.object({
  id: z.uuid(),
  /** Code d'invitation, utilisé dans l'URL publique /p/:code. */
  code: z.string(),
  name: z.string(),
  description: z.string(),
  state: RoomState,
  visibility: RoomVisibility,
  stack: z.array(QuestionTag),
  repo: z.object({ fullName: z.string(), url: z.string(), verified: z.boolean() }).nullable(),
  demoUrl: z.string().nullable(),
  owner: PublicAuthor,
  memberCount: z.number().int(),
  openTaskCount: z.number().int(),
  createdAt: z.iso.datetime(),
  lastActivityAt: z.iso.datetime(),
});
export type RoomSummary = z.infer<typeof RoomSummary>;

export const RoomDetail = RoomSummary.extend({
  members: z.array(RoomMemberView),
  /** Ma place dans la salle, si je suis connecté. */
  viewer: z
    .object({ role: RoomRole.nullable(), joinRequest: JoinRequestStatus.nullable() })
    .nullable(),
});
export type RoomDetail = z.infer<typeof RoomDetail>;

export const ListRoomsQuery = z.object({
  tag: z.string().trim().toLowerCase().max(40).optional(),
  state: RoomState.optional(),
  q: z.string().trim().min(2).max(200).optional(),
  /** Mes salles (membre), non listées comprises. */
  mine: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListRoomsQuery = z.infer<typeof ListRoomsQuery>;

export const ListRoomsResponse = z.object({ data: z.array(RoomSummary), page: PageInfo });
export type ListRoomsResponse = z.infer<typeof ListRoomsResponse>;

/** POST /api/v1/rooms/:id/join (R3). */
export const JoinRoomRequest = z.object({ message: z.string().trim().max(500).nullish() });
export type JoinRoomRequest = z.infer<typeof JoinRoomRequest>;

export const JoinRequestView = z.object({
  id: z.uuid(),
  roomId: z.uuid(),
  user: PublicAuthor,
  message: z.string().nullable(),
  status: JoinRequestStatus,
  createdAt: z.iso.datetime(),
  decidedAt: z.iso.datetime().nullable(),
});
export type JoinRequestView = z.infer<typeof JoinRequestView>;

/** POST /api/v1/join-requests/:id/decide (R3), réservé au créateur. */
export const DecideJoinRequest = z.object({ decision: z.enum(['accept', 'refuse']) });
export type DecideJoinRequest = z.infer<typeof DecideJoinRequest>;

export const ListJoinRequestsResponse = z.object({ data: z.array(JoinRequestView) });
export type ListJoinRequestsResponse = z.infer<typeof ListJoinRequestsResponse>;

export const JoinRoomResponse = z.object({
  id: z.uuid(),
  roomId: z.uuid(),
  status: JoinRequestStatus,
});
export type JoinRoomResponse = z.infer<typeof JoinRoomResponse>;

export const DecideJoinResponse = JoinRoomResponse.extend({ decidedAt: z.iso.datetime() });
export type DecideJoinResponse = z.infer<typeof DecideJoinResponse>;
