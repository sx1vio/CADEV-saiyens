import { z } from 'zod';
import { PublicAuthor } from './questions';
import { PageInfo } from './xp';

// Fil de la communauté : publications des membres dans des communautés thématiques, commentaires
// en fil et votes. Le contenu est public ; publier, commenter et voter demandent un compte.

export const COMMUNITY_SLUGS = [
  /** Publication libre, sans sujet précis (12/11/2026) : visible dans tous les fils. */
  'general',
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

/**
 * Types de publication. Depuis le 12/11/2026, le fil accueille tout ce qu'on publie sur LinkedIn
 * et GitHub : avancée libre (update), mise en ligne ou nouvelle version (release), célébration
 * (poste, certification, cap franchi), article ou tutoriel (article), en plus des types d'origine.
 */
export const PostKind = z.enum([
  'update',
  'showcase',
  'release',
  'celebration',
  'article',
  'discussion',
  'question',
  'opensource',
  'news',
]);
export type PostKind = z.infer<typeof PostKind>;

const HttpsUrl = z.url({ protocol: /^https$/ }).max(500);

/** Photos d'une publication : 4 au plus, envoyées avant par POST /api/v1/media. */
export const POST_IMAGES_MAX = 4;

/**
 * POST /api/v1/posts (Idempotency-Key). Comme sur LinkedIn, le titre est facultatif : une
 * publication a au moins un texte, un titre ou une photo.
 */
export const CreatePostRequest = z
  .object({
    community: CommunitySlug.default('general'),
    kind: PostKind.default('update'),
    title: z.string().trim().max(160).default(''),
    body: z.string().trim().max(10_000).default(''),
    linkUrl: HttpsUrl.nullable().default(null),
    code: z.string().max(5_000).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(30)).max(5).default([]),
    /** Identifiants renvoyés par POST /api/v1/media. */
    images: z.array(z.uuid()).max(POST_IMAGES_MAX).default([]),
  })
  .refine((p) => p.title.length > 0 || p.body.length > 0 || p.images.length > 0, {
    path: ['body'],
    message: 'empty_post',
  });
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;

/** Photo d'une publication, servie par GET /api/v1/media/:id. */
export const PostImage = z.object({
  id: z.uuid(),
  url: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});
export type PostImage = z.infer<typeof PostImage>;

export const PostView = z.object({
  id: z.uuid(),
  community: CommunitySlug,
  kind: PostKind,
  /** Vide pour une publication libre. */
  title: z.string(),
  body: z.string(),
  linkUrl: z.string().nullable(),
  code: z.string().nullable(),
  tags: z.array(z.string()),
  images: z.array(PostImage),
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

/** POST /api/v1/media : réponse à l'envoi d'une photo (corps brut image/webp, jpeg ou png). */
export const UploadMediaResponse = PostImage;
export type UploadMediaResponse = z.infer<typeof UploadMediaResponse>;

/* ---------------- Activité de la plateforme (fil façon GitHub) ---------------- */

/**
 * Ce qui se passe sur DevHub, comme le fil d'activité de GitHub : certification obtenue, projet
 * lancé, pull request fusionnée, application mise en ligne, label « DevHub Ready » obtenu.
 */
export const ActivityKind = z.enum(['certificate', 'project', 'merged_pr', 'deployed', 'ready']);
export type ActivityKind = z.infer<typeof ActivityKind>;

export const ActivityItem = z.object({
  id: z.string(),
  kind: ActivityKind,
  at: z.iso.datetime(),
  actor: PublicAuthor,
  /** Ce dont on parle : titre de la certification, nom du projet, du domaine… */
  subject: z.string(),
  /** Précision : dépôt GitHub, score, titre de la tâche… */
  detail: z.string().nullable(),
  /** Lien interne (/certificat/…, /p/…) ou externe (pull request, site en ligne). */
  href: z.string(),
});
export type ActivityItem = z.infer<typeof ActivityItem>;

/** GET /api/v1/activity */
export const ListActivityQuery = z.object({
  before: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListActivityQuery = z.infer<typeof ListActivityQuery>;

export const ListActivityResponse = z.object({ data: z.array(ActivityItem) });
export type ListActivityResponse = z.infer<typeof ListActivityResponse>;
