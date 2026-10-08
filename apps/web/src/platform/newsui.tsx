import { ArrowUpRight, ChevronRight, GitFork, MessageSquare, Play, Star, Tag } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { BrandLogo, logoFor } from './logos';
import { RELEASE_LOGO, domainOf, img, type NewsItem } from './news';
import { Ago, LANG_COLOR, compact } from './ui';

const CAT_COLOR: Record<string, string> = {
  ia: '#8d6cf0',
  tech: '#0b0b0c',
  apple: '#6b7280',
  google: '#3b82f6',
  samsung: '#1428a0',
  mobile: '#22c55e',
  dev: '#ff9f1a',
  cloud: '#f97316',
  afrique: '#16a34a',
  securite: '#ef4444',
};

/** Pastille de source : initiales, couleur de la rubrique. */
export function SourceMark({ item, size = 18 }: { item: NewsItem; size?: number }) {
  const initials = item.sourceName
    .replace(/^The /, '')
    .split(/[\s·.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: CAT_COLOR[item.category] ?? '#0b0b0c',
      }}
    >
      {initials}
    </span>
  );
}

function Meta({ item, className }: { item: NewsItem; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5 text-[12px] text-muted', className)}>
      <SourceMark item={item} />
      <span className="truncate font-medium text-fg">{item.sourceName}</span>
      <span aria-hidden>·</span>
      <Ago iso={item.publishedAt} className="shrink-0" />
      {item.lang === 'fr' && (
        <span className="shrink-0 rounded-full bg-canvas px-1.5 text-[10.5px] font-semibold text-muted">
          FR
        </span>
      )}
    </span>
  );
}

/** Image d'article : se replie proprement si elle ne charge pas. */
export function Thumb({
  src,
  className,
  alt = '',
  w = 640,
}: {
  src: string | null;
  className?: string;
  alt?: string;
  w?: number;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <div className={cn('bg-surface-2', className)} aria-hidden />;
  return (
    <img
      src={img(src, w) ?? ''}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={cn('object-cover', className)}
    />
  );
}

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** À la une : grande carte + liste. */
export function HeroNews({ items }: { items: NewsItem[] }) {
  const [main, ...rest] = items;
  if (!main) return null;
  return (
    <section className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
      <a
        href={main.url}
        {...ext}
        className="group relative overflow-hidden rounded-[24px] bg-black text-white"
      >
        <Thumb
          src={main.image}
          w={1280}
          className="aspect-[16/10] w-full opacity-90 transition-transform duration-500 group-hover:scale-[1.02] lg:aspect-auto lg:h-full lg:min-h-[380px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(0,0,0,0.88))]" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur-md">
            À la une · {main.sourceName}
          </span>
          <h2 className="mt-3 text-[22px] leading-[1.15] font-bold tracking-[-0.03em] sm:text-[30px]">
            {main.title}
          </h2>
          <p className="mt-2 line-clamp-2 max-w-2xl text-[14px] text-white/75">{main.summary}</p>
          <p className="mt-3 text-[12px] text-white/60">
            <Ago iso={main.publishedAt} /> · {domainOf(main.url)}
          </p>
        </div>
      </a>
      <ul className="flex flex-col gap-2">
        {rest.map((it) => (
          <li key={it.id}>
            <a
              href={it.url}
              {...ext}
              className="group flex gap-3 rounded-[20px] bg-surface-1 p-3 transition-colors hover:bg-surface-2"
            >
              <Thumb
                src={it.image}
                w={320}
                className="aspect-[4/3] w-28 shrink-0 rounded-[14px] sm:w-32"
              />
              <span className="flex min-w-0 flex-col justify-between py-0.5">
                <span className="line-clamp-3 text-[14px] leading-snug font-semibold text-fg group-hover:underline">
                  {it.title}
                </span>
                <Meta item={it} className="mt-2" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Carte d'article (grille d'actualités). */
export function ArticleCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      {...ext}
      className="group flex flex-col overflow-hidden rounded-[20px] bg-surface-1 transition-colors hover:bg-surface-2"
    >
      <Thumb src={item.image} className="aspect-[16/9] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Meta item={item} />
        <h3 className="line-clamp-3 text-[15px] leading-snug font-semibold tracking-[-0.01em] text-fg group-hover:underline">
          {item.title}
        </h3>
        {item.summary && <p className="line-clamp-2 text-[13px] text-muted">{item.summary}</p>}
        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[12px] font-medium text-subtle">
          {domainOf(item.url)}
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </a>
  );
}

/** Vidéo YouTube réelle : miniature officielle, lecture intégrée sur DevHub. */
export function VideoTile({ item, className }: { item: NewsItem; className?: string }) {
  const vid = (item.extra.videoId as string) ?? '';
  return (
    <Link
      to={`/videos/yt/${vid}`}
      state={{ item }}
      className={cn('group flex flex-col gap-2.5', className)}
    >
      <div className="relative overflow-hidden rounded-[16px] bg-black">
        <Thumb
          src={item.image}
          w={480}
          className="aspect-video w-full scale-[1.01] transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="grid size-12 place-items-center rounded-full bg-black/70 text-white">
            <Play className="ml-0.5 size-5" fill="currentColor" />
          </span>
        </span>
        {item.lang === 'fr' && (
          <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10.5px] font-semibold text-white">
            FR
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold text-fg">
          {item.title}
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] text-muted">
          {item.sourceName}
          {item.score > 0 && ` · ${compact(item.score)} vues`} · <Ago iso={item.publishedAt} />
        </p>
      </div>
    </Link>
  );
}

/** Rangée Hacker News (façon liste « Drivers ») : points en gras, commentaires. */
export function HnRow({ item, rank }: { item: NewsItem; rank: number }) {
  const link = (item.extra.link as string) ?? item.url;
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] bg-surface-1 py-2.5 pr-3 pl-4 transition-colors hover:bg-surface-2">
      <span className="text-[12px] text-subtle tabular">{rank}</span>
      <span className="min-w-0">
        <a
          href={link}
          {...ext}
          className="line-clamp-2 text-[13.5px] leading-snug font-semibold text-fg hover:underline"
        >
          {item.title}
        </a>
        <span className="block truncate text-[11.5px] text-subtle">
          {(item.extra.domain as string) || 'news.ycombinator.com'}
        </span>
      </span>
      <a
        href={item.url}
        {...ext}
        className="flex flex-col items-end text-[12px] leading-tight"
        title="Discussion sur Hacker News"
      >
        <span>
          <b className="font-semibold text-fg tabular">{item.score}</b>{' '}
          <span className="text-subtle">points</span>
        </span>
        <span className="inline-flex items-center gap-1 text-subtle">
          <MessageSquare className="size-3" />
          {item.comments}
        </span>
      </a>
    </li>
  );
}

/** Dépôt GitHub de la semaine. */
export function RepoRow({ item }: { item: NewsItem }) {
  const lang = item.extra.language as string | null;
  return (
    <li>
      <a
        href={item.url}
        {...ext}
        className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] bg-surface-1 py-2.5 pr-3 pl-3 transition-colors hover:bg-surface-2"
      >
        <Thumb src={item.image} w={160} className="size-8 rounded-[10px]" />
        <span className="min-w-0">
          <span className="block truncate font-mono text-[13px] font-semibold text-fg">
            {item.title}
          </span>
          <span className="block truncate text-[12px] text-muted">
            {item.summary || 'Pas de description'}
          </span>
        </span>
        <span className="flex flex-col items-end gap-0.5 text-[12px] leading-tight">
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 text-[#f0b232]" />
            <b className="font-semibold text-fg tabular">{compact(item.score)}</b>
          </span>
          {lang && (
            <span className="inline-flex items-center gap-1 text-subtle">
              <span
                className="size-2 rounded-full"
                style={{ background: LANG_COLOR[lang] ?? '#8b8e9b' }}
              />
              {lang}
            </span>
          )}
        </span>
      </a>
    </li>
  );
}

/** Carte du radar des nouvelles versions. */
export function ReleaseCard({ item }: { item: NewsItem }) {
  const repo = item.extra.repo as string;
  const logo = RELEASE_LOGO[repo];
  return (
    <a
      href={item.url}
      {...ext}
      className="group flex items-center gap-3 rounded-[16px] bg-surface-1 p-3 transition-colors hover:bg-surface-2"
    >
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-canvas shadow-sm">
        {logo && logoFor(logo) ? (
          <BrandLogo name={logo} size={20} />
        ) : (
          <Thumb src={item.image} w={160} className="size-10" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-semibold text-fg">
          {repo.split('/')[1]}
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] text-muted">
          <Tag className="size-3" />
          <span className="truncate font-mono">{item.extra.tag as string}</span>
          <span aria-hidden>·</span>
          <Ago iso={item.publishedAt} />
        </span>
      </span>
    </a>
  );
}

/** Article DEV Community. */
export function DevtoCard({ item }: { item: NewsItem }) {
  const tags = (item.extra.tags as string[] | undefined) ?? [];
  return (
    <a
      href={item.url}
      {...ext}
      className="group flex flex-col overflow-hidden rounded-[20px] bg-surface-1 transition-colors hover:bg-surface-2"
    >
      <Thumb src={item.image} className="aspect-[2/1] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="flex items-center gap-2 text-[12px] text-muted">
          {typeof item.extra.avatar === 'string' && (
            <img
              src={img(item.extra.avatar, 160) ?? undefined}
              alt=""
              className="size-5 rounded-full"
              loading="lazy"
            />
          )}
          <span className="truncate font-medium text-fg">{item.author}</span>
          <span aria-hidden>·</span>
          {String(item.extra.readingTime ?? '?')} min
        </span>
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-fg group-hover:underline">
          {item.title}
        </h3>
        <span className="flex flex-wrap gap-1">
          {tags.slice(0, 4).map((t) => (
            <span key={t} className="text-[12px] text-muted">
              #{t}
            </span>
          ))}
        </span>
        <span className="mt-auto flex items-center gap-3 pt-1 text-[12px] text-subtle">
          <span>
            <b className="font-semibold text-fg tabular">{item.score}</b> réactions
          </span>
          <span>
            <b className="font-semibold text-fg tabular">{item.comments}</b> commentaires
          </span>
        </span>
      </div>
    </a>
  );
}

/** Titre de section façon « Drivers » : titre gras + action. */
export function SectionHead({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; to: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <h2 className="dh-title-bar text-[18px] font-bold tracking-[-0.02em] text-fg">{title}</h2>
      {children}
      {action && (
        <Link
          to={action.to}
          className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-fg"
        >
          {action.label}
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export { GitFork };
