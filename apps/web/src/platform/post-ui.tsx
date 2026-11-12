import {
  Award,
  BadgeCheck,
  Bookmark,
  ExternalLink,
  GitFork,
  GitMerge,
  Globe,
  MessageSquare,
  Rocket,
  Share2,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/primitives';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import {
  type ActivityItem,
  type PostImage,
  type PostView,
  LikeIcon,
  POST_KINDS,
  hostOf,
  share,
  useLike,
} from './community';
import { BrandLogo, TechChip } from './logos';
import { usePlatform } from './store';
import { Ago, LANG_COLOR, communityOf, compact } from './ui';

/* ---------------- En-tête : auteur, type, sujet, date ---------------- */

export function PostHeader({ post, size = 48 }: { post: PostView; size?: number }) {
  const kind = POST_KINDS[post.kind];
  const topic = post.community === 'general' ? null : communityOf(post.community);
  return (
    <header className="flex items-start gap-3">
      <Link to={`/u/${post.author.handle}`} className="relative z-10 shrink-0">
        <Avatar name={post.author.displayName} src={post.author.avatarUrl} size={size} />
      </Link>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="flex flex-wrap items-center gap-x-1.5">
          <Link
            to={`/u/${post.author.handle}`}
            className="relative z-10 text-[15px] font-semibold text-fg hover:text-accent-text hover:underline"
          >
            {post.author.displayName}
          </Link>
          {post.author.isDemo && (
            <span className="rounded-[4px] bg-surface-3 px-1.5 py-px text-[11px] font-medium text-muted">
              Démo
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-subtle">@{post.author.handle}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-subtle">
          <span className="inline-flex items-center gap-1 font-medium text-muted">
            <kind.icon className="size-3.5" />
            {kind.label}
          </span>
          {topic && (
            <>
              <span aria-hidden>·</span>
              <Link to={`/?topic=${topic.slug}`} className="relative z-10 hover:underline">
                {topic.name}
              </Link>
            </>
          )}
          <span aria-hidden>·</span>
          <Ago iso={post.createdAt} />
        </p>
      </div>
    </header>
  );
}

/* ---------------- Texte avec « voir plus » ---------------- */

export function PostText({ text, lines = 5 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320 || text.split('\n').length > lines;
  return (
    <div className="relative z-10">
      <p
        className={cn(
          'text-[15px] leading-[1.6] whitespace-pre-line text-fg [overflow-wrap:anywhere]',
          !open && long && 'line-clamp-5',
        )}
      >
        {text}
      </p>
      {long && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-0.5 text-[14px] font-semibold text-muted hover:text-accent-text hover:underline"
        >
          …voir plus
        </button>
      )}
    </div>
  );
}

/* ---------------- Photos (grille façon LinkedIn) ---------------- */

export function PostImages({ images, alt }: { images: PostImage[]; alt: string }) {
  if (images.length === 0) return null;
  const n = images.length;
  const img = (m: PostImage, className: string, i: number) => (
    <a
      key={m.id}
      href={m.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('relative z-10 block overflow-hidden bg-surface-2', className)}
    >
      <img
        src={m.url}
        alt={n > 1 ? `${alt} (photo ${i + 1} sur ${n})` : alt}
        width={m.width}
        height={m.height}
        loading="lazy"
        decoding="async"
        className="size-full object-cover transition-transform duration-300 hover:scale-[1.015]"
      />
    </a>
  );
  if (n === 1) {
    // Pleine largeur, hauteur bornée : un portrait est recadré au centre, comme sur LinkedIn.
    const m = images[0]!;
    return (
      <a
        href={m.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 mt-3 block bg-surface-2"
      >
        <img
          src={m.url}
          alt={alt}
          width={m.width}
          height={m.height}
          loading="lazy"
          decoding="async"
          className="h-auto max-h-[560px] w-full object-cover"
        />
      </a>
    );
  }
  if (n === 2)
    return (
      <div className="mt-3 grid aspect-[2/1] grid-cols-2 gap-0.5">
        {images.map((m, i) => img(m, 'h-full', i))}
      </div>
    );
  if (n === 3)
    return (
      <div className="mt-3 grid aspect-[3/2] grid-cols-[2fr_1fr] grid-rows-2 gap-0.5">
        {img(images[0]!, 'row-span-2 h-full', 0)}
        {img(images[1]!, 'h-full', 1)}
        {img(images[2]!, 'h-full', 2)}
      </div>
    );
  return (
    <div className="mt-3 grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 sm:aspect-[4/3]">
      {images.slice(0, 4).map((m, i) => img(m, 'h-full', i))}
    </div>
  );
}

/* ---------------- Dépôt GitHub (carte façon GitHub) ---------------- */

interface GhRepo {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  html_url: string;
}

/** owner/repo d'une adresse github.com, sinon null. */
export function repoOf(url: string | null): string | null {
  if (!url) return null;
  const m =
    /^https:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?(?:[#?].*)?$/i.exec(url);
  return m ? `${m[1]}/${m[2]}` : null;
}

export function RepoCard({ repo }: { repo: string }) {
  // Données publiques de GitHub, mises en cache par le client de requêtes ; sans réseau ou
  // quota épuisé, la carte garde le nom du dépôt et son lien.
  const { data } = useQuery<GhRepo | null>(`gh:repo:${repo}`, async () => {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    return res.ok ? ((await res.json()) as GhRepo) : null;
  });
  const [owner, name] = repo.split('/');
  return (
    <a
      href={`https://github.com/${repo}`}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="relative z-10 mt-3 block rounded-[12px] border border-line bg-canvas p-4 transition-colors hover:border-line-strong"
    >
      <p className="flex items-center gap-2 text-[15px] text-fg">
        <BrandLogo name="GitHub" size={18} />
        <span className="truncate">
          <span className="text-muted">{owner} / </span>
          <span className="font-semibold">{name}</span>
        </span>
      </p>
      {data?.description && (
        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
          {data.description}
        </p>
      )}
      {data && data.topics && data.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.topics.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent-text"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {data && (
        <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-subtle">
          {data.language && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: LANG_COLOR[data.language] ?? 'var(--color-subtle, #8b949e)' }}
              />
              {data.language}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5" />
            {compact(data.stargazers_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork className="size-3.5" />
            {compact(data.forks_count)}
          </span>
        </p>
      )}
    </a>
  );
}

export function LinkCard({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="relative z-10 mt-3 flex items-center gap-3 rounded-[12px] border border-line bg-canvas px-4 py-3 transition-colors hover:border-line-strong"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-surface-2">
        <ExternalLink className="size-[18px] text-subtle" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-fg">{hostOf(url)}</span>
        <span className="block truncate text-[12.5px] text-subtle">{url}</span>
      </span>
    </a>
  );
}

/** Lien de la publication : carte GitHub pour un dépôt, carte de lien sinon. */
export function PostAttachment({ url }: { url: string | null }) {
  if (!url) return null;
  const repo = repoOf(url);
  return repo ? <RepoCard repo={repo} /> : <LinkCard url={url} />;
}

/* ---------------- Carte de publication (fil) ---------------- */

export function PostCard({ post }: { post: PostView }) {
  const saved = usePlatform((s) => s.saved.includes(post.id));
  const toggleSaved = usePlatform((s) => s.toggle);
  const like = useLike(post);
  const label = post.title || post.body.slice(0, 80) || `Publication de ${post.author.displayName}`;
  const action =
    'relative z-10 inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[8px] text-[14px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-fg';
  return (
    <article
      className={cn(
        'dh-panel group relative overflow-hidden',
        post.kind === 'celebration' &&
          'ring-1 ring-[color-mix(in_srgb,var(--color-gold,#d4a017)_45%,transparent)]',
      )}
    >
      <Link to={`/post/${post.id}`} className="absolute inset-0" aria-label={label} />
      <div className="px-4 pt-4">
        <PostHeader post={post} />
        <div className="mt-3">
          {post.title && (
            <h3 className="mb-1.5 text-[16px] leading-snug font-semibold tracking-[-0.01em] text-fg">
              {post.title}
            </h3>
          )}
          {post.body && <PostText text={post.body} />}
          {post.code && (
            <pre className="relative z-10 mt-3 max-h-48 overflow-hidden rounded-[8px] border border-line bg-inset px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-fg">
              <code className="whitespace-pre">{post.code}</code>
            </pre>
          )}
        </div>
      </div>
      <PostImages images={post.images} alt={label} />
      <div className="px-4">
        <PostAttachment url={post.linkUrl} />
        {post.tags.length > 0 && (
          <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 5).map((t) => (
              <TechChip key={t} label={t} />
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-3 border-b border-line pb-2 text-[13px] text-subtle">
          <span className="inline-flex items-center gap-1.5">
            {like.likes > 0 && (
              <>
                <span className="grid size-[18px] place-items-center rounded-full bg-accent text-white">
                  <LikeIcon className="size-[11px]" fill="currentColor" />
                </span>
                {compact(like.likes)}
              </>
            )}
          </span>
          {post.comments > 0 && (
            <Link to={`/post/${post.id}`} className="relative z-10 hover:text-fg hover:underline">
              {post.comments} commentaire{post.comments > 1 ? 's' : ''}
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 px-2 py-1">
        <button
          type="button"
          aria-pressed={like.liked}
          onClick={() => void like.toggle()}
          className={cn(action, like.liked && 'text-accent-text')}
        >
          <LikeIcon className="size-[19px]" fill={like.liked ? 'currentColor' : 'none'} />
          <span className="hidden sm:inline">J’aime</span>
        </button>
        <Link to={`/post/${post.id}#commenter`} className={action}>
          <MessageSquare className="size-[19px]" />
          <span className="hidden sm:inline">Commenter</span>
        </Link>
        <button type="button" onClick={() => share(`/post/${post.id}`)} className={action}>
          <Share2 className="size-[19px]" />
          <span className="hidden sm:inline">Partager</span>
        </button>
        <button
          type="button"
          aria-pressed={saved}
          onClick={() => toggleSaved('saved', post.id)}
          className={cn(action, saved && 'text-accent-text')}
        >
          <Bookmark className="size-[19px]" fill={saved ? 'currentColor' : 'none'} />
          <span className="hidden sm:inline">{saved ? 'Enregistré' : 'Enregistrer'}</span>
        </button>
      </div>
    </article>
  );
}

/* ---------------- Activité de la plateforme (façon GitHub) ---------------- */

const ACTIVITY: Record<
  ActivityItem['kind'],
  { icon: LucideIcon; color: string; verb: string; noun?: string }
> = {
  certificate: { icon: Award, color: '#d4a017', verb: 'a obtenu la certification' },
  project: { icon: Rocket, color: '#2563eb', verb: 'a lancé le projet' },
  merged_pr: { icon: GitMerge, color: '#8250df', verb: 'a fait fusionner une pull request dans' },
  deployed: { icon: Globe, color: '#1a7f37', verb: 'a mis en ligne' },
  ready: { icon: BadgeCheck, color: '#0e7490', verb: 'a obtenu le label DevHub Ready pour' },
};

export function ActivityCard({ item }: { item: ActivityItem }) {
  const a = ACTIVITY[item.kind];
  const external = /^https?:\/\//.test(item.href);
  const subject = <span className="font-semibold text-fg">{item.subject}</span>;
  return (
    <article className="dh-panel relative flex items-start gap-3 px-4 py-3.5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full text-white"
        style={{ background: a.color }}
        aria-hidden
      >
        <a.icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] leading-snug text-muted">
          <Link
            to={`/u/${item.actor.handle}`}
            className="font-semibold text-fg hover:text-accent-text hover:underline"
          >
            {item.actor.displayName}
          </Link>{' '}
          {a.verb}{' '}
          {external ? (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="hover:underline"
            >
              {subject}
            </a>
          ) : (
            <Link to={item.href} className="hover:underline">
              {subject}
            </Link>
          )}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-subtle">
          {item.detail && <span className="truncate">{item.detail}</span>}
          {item.detail && <span aria-hidden>·</span>}
          <Ago iso={item.at} />
          {item.actor.isDemo && (
            <span className="rounded-[4px] bg-surface-3 px-1.5 py-px text-[11px] font-medium text-muted">
              Démo
            </span>
          )}
        </p>
      </div>
      <Avatar name={item.actor.displayName} src={item.actor.avatarUrl} size={32} />
    </article>
  );
}
