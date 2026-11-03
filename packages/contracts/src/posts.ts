import { z } from 'zod';
import { PublicAuthor } from './questions';
import { PageInfo } from './xp';

// Fil de la communauté : publications des membres dans des communautés thématiques, commentaires
// en fil et votes. Le contenu est public ; publier, commenter et voter demandent un compte.

export const COMMUNITY_SLUGS = [
  'ia',
  'web',
  'mobile',
  'backend',
  'devops',
  'data',
  'opensource',
  'carriere',
  'fintech',
  'showcase',
] as const;
export const CommunitySlug = z.enum(COMMUNITY_SLUGS);
export type CommunitySlug = z.infer<typeof CommunitySlug>;

export const PostKind = z.enum(['discussion', 'question', 'showcase', 'news', 'opensource']);
export type PostKind = z.infer<typeof PostKind>;

const HttpsUrl = z.url({ protocol: /^https$/ }).max(500);

/** POST /api/v1/posts (Idempotency-Key) */
export const CreatePostRequest = z.object({
  community: CommunitySlug,
  kind: PostKind,
  title: z.string().trim().min(8).max(160),
  body: z.string().trim().max(10_000).default(''),
  linkUrl: HttpsUrl.nullable().default(null),
  code: z.string().max(5_000).nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(30)).max(5).default([]),
});
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;

export const PostView = z.object({
  id: z.uuid(),
  community: CommunitySlug,
  kind: PostKind,
  title: z.string(),
  body: z.string(),
  linkUrl: z.string().nullable(),
  code: z.string().nullable(),
  tags: z.array(z.string()),
  author: PublicAuthor,
  score: z.number().int(),
  /** Vote du visiteur connecté : 1, -1 ou 0 */
  myVote: z.number().int(),
  comments: z.number().int(),
  mine: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type PostView = z.infer<typeof PostView>;

/** GET /api/v1/posts */
export const ListPostsQuery = z.object({
  community: CommunitySlug.optional(),
  author: z.string().max(60).optional(),
  sort: z.enum(['recent', 'top']).default('recent'),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListPostsQuery = z.infer<typeof ListPostsQuery>;

export const ListPostsResponse = z.object({ data: z.array(PostView), page: PageInfo });
export type ListPostsResponse = z.infer<typeof ListPostsResponse>;

export const PostCommentView = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  body: z.string(),
  author: PublicAuthor,
  mine: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type PostCommentView = z.infer<typeof PostCommentView>;

/** GET /api/v1/posts/:id */
export const PostDetail = PostView.extend({ commentList: z.array(PostCommentView) });
export type PostDetail = z.infer<typeof PostDetail>;

/** POST /api/v1/posts/:id/comments (Idempotency-Key) */
export const CreatePostCommentRequest = z.object({
  body: z.string().trim().min(2).max(5_000),
  parentId: z.uuid().nullable().default(null),
});
export type CreatePostCommentRequest = z.infer<typeof CreatePostCommentRequest>;

/** PUT /api/v1/posts/:id/vote */
export const PostVoteRequest = z.object({
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});
export type PostVoteRequest = z.infer<typeof PostVoteRequest>;

export const PostVoteResponse = z.object({ score: z.number().int(), myVote: z.number().int() });
export type PostVoteResponse = z.infer<typeof PostVoteResponse>;

/** GET /api/v1/communities : activité réelle de chaque communauté. */
export const CommunityStats = z.object({
  slug: CommunitySlug,
  posts: z.number().int(),
  posts7d: z.number().int(),
  authors: z.number().int(),
});
export const ListCommunitiesResponse = z.object({ data: z.array(CommunityStats) });
export type ListCommunitiesResponse = z.infer<typeof ListCommunitiesResponse>;
