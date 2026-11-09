import type {
  CommunitySlug,
  CreatePostRequest,
  ListCommunitiesResponse,
  ListPostsResponse,
  PostDetail,
  PostKind,
  PostVoteResponse,
  PostView,
} from '@devhub/contracts';
import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  Code2,
  ExternalLink,
  FolderGit2,
  HelpCircle,
  MessageSquare,
  Newspaper,
  Rocket,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DomainError } from '@/services/types';
import { useSession } from '@/stores/app';
import { usePlatform } from './store';
import { Ago, CommunityIcon, communityOf, compact } from './ui';
import { TechChip } from './logos';

export type { PostView, PostDetail, PostKind, CommunitySlug };

/* ---------------- Client de l'API du fil ---------------- */

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['X-DevHub-Client'] = 'web';
    headers['Idempotency-Key'] = crypto.randomUUID();
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new DomainError('network.offline');
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string };
    throw new DomainError(err.code ?? `http.${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const communityApi = {
  list: (q: { community?: string; author?: string; sort?: 'recent' | 'top'; cursor?: string }) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v) p.set(k, v);
    return call<ListPostsResponse>('GET', `/posts?${p.toString()}`);
  },
  get: (id: string) => call<PostDetail>('GET', `/posts/${id}`),
  create: (body: CreatePostRequest) => call<{ id: string }>('POST', '/posts', body),
  remove: (id: string) => call<void>('DELETE', `/posts/${id}`),
  comment: (id: string, body: string, parentId: string | null) =>
    call<{ id: string }>('POST', `/posts/${id}/comments`, { body, parentId }),
  removeComment: (id: string, commentId: string) =>
    call<void>('DELETE', `/posts/${id}/comments/${commentId}`),
  vote: (id: string, value: -1 | 0 | 1) =>
    call<PostVoteResponse>('PUT', `/posts/${id}/vote`, { value }),
  communities: () => call<ListCommunitiesResponse>('GET', '/communities'),
};

/** Message lisible pour une erreur du fil. */
export function communityError(e: unknown): string {
  const code = e instanceof DomainError ? e.code : '';
  if (code === 'auth.required' || code === 'http.401') return 'Connecte-toi pour participer.';
  if (code === 'post.daily_limit') return 'Tu as atteint la limite de 10 publications par jour.';
  if (code === 'comment.daily_limit') return 'Limite de commentaires atteinte pour aujourd’hui.';
  if (code === 'post.links_too_early')
    return 'Les nouveaux comptes peuvent publier des liens après leur première heure.';
  if (code === 'network.offline') return 'Pas de connexion. Réessaie quand le réseau revient.';
  if (code === 'validation.failed' || code === 'http.400')
    return 'Vérifie les champs du formulaire.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

/* ---------------- Types de publication ---------------- */

export const POST_KINDS: Record<PostKind, { label: string; icon: LucideIcon; hint: string }> = {
  discussion: {
    label: 'Discussion',
    icon: MessageSquare,
    hint: 'Lancer un échange, demander un avis',
  },
  question: {
    label: 'Question',
    icon: HelpCircle,
    hint: 'Poser une question ouverte à la communauté',
  },
  showcase: {
    label: 'Projet',
    icon: Rocket,
    hint: 'Montrer ce que tu construis, demander des retours',
  },
  opensource: {
    label: 'Open source',
    icon: FolderGit2,
    hint: 'Un dépôt qui cherche des contributeurs',
  },
  news: { label: 'Actu', icon: Newspaper, hint: 'Partager une nouveauté, avec sa source' },
};

export function PostKindBadge({ kind }: { kind: PostKind }) {
  const k = POST_KINDS[kind];
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-[5px] bg-surface-3 px-1.5 text-[11.5px] font-medium text-muted">
      <k.icon className="size-3" />
      {k.label}
    </span>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export function share(path: string) {
  const url = `${location.origin}${path}`;
  void navigator.clipboard?.writeText(url).then(
    () => toast.success('Lien copié'),
    () => toast.error('Copie impossible'),
  );
}

/* ---------------- Vote ---------------- */

export function PostVote({
  post,
  vertical = true,
  onChange,
}: {
  post: Pick<PostView, 'id' | 'score' | 'myVote'>;
  vertical?: boolean;
  onChange?: (v: PostVoteResponse) => void;
}) {
  const me = useSession((s) => s.user);
  const nav = useNavigate();
  const [state, setState] = useState({ score: post.score, myVote: post.myVote });
  const [busy, setBusy] = useState(false);

  const vote = async (dir: 1 | -1) => {
    if (!me) return nav('/connexion');
    if (busy) return;
    const value = (state.myVote === dir ? 0 : dir) as -1 | 0 | 1;
    const prev = state;
    // Mise à jour immédiate, corrigée par la réponse du serveur.
    setState({ score: state.score - state.myVote + value, myVote: value });
    setBusy(true);
    try {
      const r = await communityApi.vote(post.id, value);
      setState(r);
      onChange?.(r);
    } catch (e) {
      setState(prev);
      toast.error(communityError(e));
    } finally {
      setBusy(false);
    }
  };

  const btn = (dir: 1 | -1) => {
    const on = state.myVote === dir;
    const Icon = dir === 1 ? ArrowBigUp : ArrowBigDown;
    return (
      <button
        type="button"
        aria-label={dir === 1 ? 'Voter pour' : 'Voter contre'}
        aria-pressed={on}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void vote(dir);
        }}
        className={cn(
          'grid size-7 place-items-center rounded-full transition-colors hover:bg-surface-3',
          on ? (dir === 1 ? 'text-[#ff6b3d]' : 'text-[#7c8cff]') : 'text-subtle hover:text-fg',
        )}
      >
        <Icon className="size-[18px]" fill={on ? 'currentColor' : 'none'} />
      </button>
    );
  };

  return (
    <div
      className={cn(
        'flex shrink-0 items-center',
        vertical ? 'w-9 flex-col' : 'rounded-full bg-surface-2',
      )}
    >
      {btn(1)}
      <span
        className={cn(
          'min-w-6 text-center text-[12px] font-semibold tabular-nums',
          state.myVote === 1
            ? 'text-[#ff6b3d]'
            : state.myVote === -1
              ? 'text-[#7c8cff]'
              : 'text-fg',
        )}
      >
        {compact(state.score)}
      </span>
      {btn(-1)}
    </div>
  );
}

/* ---------------- Carte de publication ---------------- */

export function PostCard({ post }: { post: PostView }) {
  const saved = usePlatform((s) => s.saved.includes(post.id));
  const toggle = usePlatform((s) => s.toggle);
  return (
    <article className="dh-panel dh-panel-link group relative flex gap-1.5 py-2 pr-4 pl-1.5">
      <Link
        to={`/post/${post.id}`}
        className="absolute inset-0 rounded-[12px]"
        aria-label={post.title}
      />
      <div className="relative z-10 pt-0.5">
        <PostVote post={post} />
      </div>
      <div className="min-w-0 flex-1 py-1">
        <div className="relative z-10 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-subtle">
          <Link
            to={`/?topic=${post.community}`}
            className="inline-flex items-center gap-1.5 font-medium text-fg hover:underline"
          >
            <CommunityIcon slug={post.community} size={18} />
            {communityOf(post.community).name}
          </Link>
          <span aria-hidden>·</span>
          <Link to={`/u/${post.author.handle}`} className="hover:underline">
            {post.author.displayName}
          </Link>
          <span aria-hidden>·</span>
          <Ago iso={post.createdAt} />
          <span className="ml-1">
            <PostKindBadge kind={post.kind} />
          </span>
        </div>
        <h3 className="mt-1.5 text-[15px] leading-snug font-semibold tracking-[-0.01em] text-fg">
          {post.title}
        </h3>
        {post.body && (
          <p className="mt-1 line-clamp-3 text-[13.5px] leading-[1.55] text-muted">{post.body}</p>
        )}
        {post.code && (
          <pre className="mt-2 overflow-hidden rounded-[8px] border border-line bg-inset px-3 py-2 font-mono text-[12px] text-muted">
            <span className="line-clamp-2 whitespace-pre-wrap">{post.code}</span>
          </pre>
        )}
        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 mt-2.5 inline-flex max-w-full items-center gap-2 rounded-[10px] bg-canvas px-3 py-2 text-[12.5px] font-medium text-fg"
          >
            <ExternalLink className="size-3.5 shrink-0 text-subtle" />
            <span className="truncate">{hostOf(post.linkUrl)}</span>
          </a>
        )}
        <div className="relative z-10 mt-2 -ml-2 flex flex-wrap items-center gap-0.5 text-[12.5px] font-medium text-muted">
          <Link
            to={`/post/${post.id}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 hover:bg-surface-3"
          >
            <MessageSquare className="size-[15px]" />
            {post.comments} commentaire{post.comments > 1 ? 's' : ''}
          </Link>
          <button
            type="button"
            onClick={() => share(`/post/${post.id}`)}
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 hover:bg-surface-3"
          >
            <Share2 className="size-[15px]" />
            Partager
          </button>
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => toggle('saved', post.id)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full px-2 hover:bg-surface-3',
              saved && 'text-accent-text',
            )}
          >
            <Bookmark className="size-[15px]" fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
          {post.code && (
            <Code2 className="ml-1 size-[15px] text-subtle" aria-label="Contient du code" />
          )}
          <span className="ml-auto hidden gap-1 sm:flex">
            {post.tags.slice(0, 3).map((t) => (
              <TechChip key={t} label={t} />
            ))}
          </span>
        </div>
      </div>
    </article>
  );
}
