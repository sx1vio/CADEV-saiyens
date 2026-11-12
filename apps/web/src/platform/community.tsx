import type {
  ActivityItem,
  CommunitySlug,
  CreatePostRequest,
  ListActivityResponse,
  ListCommunitiesResponse,
  ListPostsResponse,
  PostDetail,
  PostKind,
  PostImage,
  PostVoteResponse,
  PostView,
} from '@devhub/contracts';
import {
  ArrowBigDown,
  ArrowBigUp,
  FileText,
  FolderGit2,
  HelpCircle,
  MessageSquare,
  Newspaper,
  PackageCheck,
  PartyPopper,
  PenLine,
  Rocket,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DomainError } from '@/services/types';
import { useSession } from '@/stores/app';
import { compact } from './ui';

export type { ActivityItem, PostView, PostDetail, PostImage, PostKind, CommunitySlug };

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
  activity: (before?: string) =>
    call<ListActivityResponse>('GET', `/activity?limit=20${before ? `&before=${before}` : ''}`),
};

/** Réduit une photo dans le navigateur (1 600 px, WebP) puis l'envoie : POST /api/v1/media. */
export async function uploadImage(file: File): Promise<PostImage> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new DomainError('media.unsupported');
  });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await encode('image/webp', 0.82);
  // Navigateur sans encodeur WebP : il rend du PNG, souvent trop lourd ; on passe en JPEG.
  if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.85);
  if (blob && blob.size > 1_900_000) blob = await encode(blob.type, 0.6);
  if (!blob) throw new DomainError('media.unsupported');
  const res = await fetch(`/api/v1/media?w=${width}&h=${height}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type, 'X-DevHub-Client': 'web', Accept: 'application/json' },
    credentials: 'include',
    body: blob,
  }).catch(() => {
    throw new DomainError('network.offline');
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string };
    throw new DomainError(err.code ?? `http.${res.status}`);
  }
  return (await res.json()) as PostImage;
}

/** Message lisible pour une erreur du fil. */
export function communityError(e: unknown): string {
  const code = e instanceof DomainError ? e.code : '';
  if (code === 'auth.required' || code === 'http.401') return 'Connecte-toi pour participer.';
  if (code === 'post.daily_limit') return 'Tu as atteint la limite de 10 publications par jour.';
  if (code === 'comment.daily_limit') return 'Limite de commentaires atteinte pour aujourd’hui.';
  if (code === 'post.links_too_early')
    return 'Les nouveaux comptes peuvent publier des liens après leur première heure.';
  if (code === 'network.offline') return 'Pas de connexion. Réessaie quand le réseau revient.';
  if (code === 'media.too_large') return 'Photo trop lourde, même réduite (2 Mo au plus).';
  if (code === 'media.unsupported') return 'Format non pris en charge : JPEG, PNG ou WebP.';
  if (code === 'media.daily_limit')
    return 'Tu as envoyé beaucoup de photos aujourd’hui. Réessaie demain.';
  if (code === 'post.images_invalid')
    return 'Une photo n’a pas été envoyée correctement. Retire-la et réessaie.';
  if (code === 'validation.failed' || code === 'http.400')
    return 'Vérifie les champs du formulaire.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

/* ---------------- Types de publication ---------------- */

export const POST_KINDS: Record<PostKind, { label: string; icon: LucideIcon; hint: string }> = {
  update: {
    label: 'Publication',
    icon: PenLine,
    hint: 'Une avancée, une idée, ce que tu as appris',
  },
  release: {
    label: 'Mise en ligne',
    icon: PackageCheck,
    hint: 'Une app en ligne, une nouvelle version',
  },
  celebration: {
    label: 'Célébration',
    icon: PartyPopper,
    hint: 'Nouveau poste, certification, cap franchi',
  },
  article: {
    label: 'Article',
    icon: FileText,
    hint: 'Un tutoriel, un retour d’expérience',
  },
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

export const hostOf = (url: string) => {
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

/* ---------------- J'aime (façon LinkedIn) ---------------- */

/** Bouton « J'aime » : un vote +1, retiré au second clic. */
export function useLike(post: Pick<PostView, 'id' | 'score' | 'myVote'>) {
  const me = useSession((s) => s.user);
  const nav = useNavigate();
  const [state, setState] = useState({ score: post.score, myVote: post.myVote });
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!me) return nav('/connexion');
    if (busy) return;
    const value = (state.myVote === 1 ? 0 : 1) as 0 | 1;
    const prev = state;
    setState({ score: state.score - state.myVote + value, myVote: value });
    setBusy(true);
    try {
      setState(await communityApi.vote(post.id, value));
    } catch (e) {
      setState(prev);
      toast.error(communityError(e));
    } finally {
      setBusy(false);
    }
  };
  return { likes: Math.max(0, state.score), liked: state.myVote === 1, toggle };
}

export const LikeIcon = ThumbsUp;
