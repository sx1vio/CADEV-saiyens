import { Play, PlaySquare } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@/lib/query';
import { Skeleton } from '@/components/ui/primitives';
import { fetchVideos, img, type Lang, type NewsItem } from '@/platform/news';
import { VideoTile } from '@/platform/newsui';
import { Ago, Chips, SERVICE_COLORS, ServiceHeader, compact } from '@/platform/ui';
import { cn } from '@/lib/utils';

/** Vidéos : tutoriels, lives et démos de projets (façon YouTube). */
const REAL_CATS = [
  { id: 'all', label: 'Tout' },
  { id: 'dev', label: 'Développement' },
  { id: 'ia', label: 'IA' },
  { id: 'tech', label: 'Tech' },
  { id: 'apple', label: 'Apple' },
  { id: 'google', label: 'Google' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'securite', label: 'Sécurité' },
];

/** Vidéos : les chaînes tech et dev suivies (YouTube), puis les créateurs DevHub. */
export default function Videos() {
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') ?? 'all';
  const [lang, setLang] = useState<Lang>('all');
  const { data, error } = useQuery<NewsItem[]>(`videos:${cat}:${lang}`, () =>
    fetchVideos({ category: cat, lang, limit: 48 }),
  );
  return (
    <div className="dh-page mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8">
      <ServiceHeader
        icon={PlaySquare}
        color={SERVICE_COLORS.videos}
        title="Vidéos"
        subtitle="Les nouvelles vidéos des chaînes tech et dev qui comptent, en français et en anglais, lisibles sans quitter DevHub."
      />
      <div className="sticky top-0 z-10 -mx-4 mt-5 flex items-center gap-3 bg-canvas px-4 py-2 sm:-mx-8 sm:px-8">
        <Chips
          className="min-w-0 flex-1"
          items={REAL_CATS}
          value={cat}
          onChange={(v) => setParams(v === 'all' ? {} : { cat: v }, { replace: true })}
        />
        <div
          className="flex shrink-0 gap-1 rounded-full bg-surface-1 p-1"
          role="group"
          aria-label="Langue"
        >
          {(['all', 'fr', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={cn(
                'h-7 rounded-full px-3 text-[12.5px] font-medium',
                lang === l ? 'lg-tint' : 'text-muted hover:text-fg',
              )}
            >
              {l === 'all' ? 'Toutes' : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {error && !data ? (
        <p className="mt-6 rounded-[10px] bg-surface-1 p-5 text-[14px] text-muted">
          Les vidéos ne sont pas disponibles pour le moment (serveur injoignable).
        </p>
      ) : !data ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-[10px]" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {data.map((v) => (
            <VideoTile key={v.id} item={v} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Lecture d'une vraie vidéo YouTube : lecteur sans cookie, chargé au clic (économie de data). */
export function YtWatch() {
  const { vid = '' } = useParams();
  const location = useLocation();
  const passed = (location.state as { item?: NewsItem } | null)?.item;
  const { data: list } = useQuery<NewsItem[]>('videos:all:all', () => fetchVideos({ limit: 48 }));
  const item = passed ?? list?.find((v) => v.extra.videoId === vid);
  const [play, setPlay] = useState(false);
  const next = (list ?? []).filter((v) => v.extra.videoId !== vid).slice(0, 14);
  return (
    <div
      key={vid}
      className="dh-page mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-0 py-0 sm:px-8 sm:py-8 xl:flex-row"
    >
      <div className="min-w-0 flex-1">
        <div className="relative aspect-video overflow-hidden bg-black sm:rounded-[10px]">
          {play ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`}
              title={item?.title ?? 'Vidéo'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlay(true)}
              className="group absolute inset-0"
              aria-label="Lire la vidéo"
            >
              <img
                src={img(`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`, 1280) ?? ''}
                alt=""
                className="size-full object-cover opacity-90"
              />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-16 place-items-center rounded-full bg-black/75 text-white transition-transform group-hover:scale-105">
                  <Play className="ml-1 size-7" fill="currentColor" />
                </span>
              </span>
            </button>
          )}
        </div>
        <div className="px-4 sm:px-0">
          <h1 className="mt-4 text-[20px] leading-snug font-bold tracking-[-0.02em] text-fg">
            {item?.title ?? 'Vidéo'}
          </h1>
          {item && (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-[14px] font-semibold text-fg">{item.sourceName}</span>
                <span className="text-[13px] text-muted">
                  {item.score > 0 && `${compact(item.score)} vues · `}
                  <Ago iso={item.publishedAt} />
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[13px] font-medium text-fg hover:bg-surface-1"
                >
                  Ouvrir sur YouTube
                </a>
              </div>
              {item.summary && (
                <p className="mt-4 rounded-[10px] bg-surface-1 p-4 text-[14px] whitespace-pre-line text-fg">
                  {item.summary}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-3 px-4 pb-6 sm:px-0 xl:w-[400px]">
        <h2 className="text-[15px] font-bold text-fg">À suivre</h2>
        {next.map((v) => (
          <Link
            key={v.id}
            to={`/videos/yt/${v.extra.videoId as string}`}
            state={{ item: v }}
            className="group flex gap-3"
          >
            <img
              src={img(v.image, 320) ?? ''}
              alt=""
              loading="lazy"
              className="aspect-video w-[168px] shrink-0 rounded-[8px] object-cover"
            />
            <span className="min-w-0 py-0.5">
              <span className="line-clamp-2 text-[13.5px] leading-snug font-semibold text-fg group-hover:underline">
                {v.title}
              </span>
              <span className="mt-1 block truncate text-[12px] text-muted">{v.sourceName}</span>
              <span className="block text-[12px] text-muted">
                <Ago iso={v.publishedAt} />
              </span>
            </span>
          </Link>
        ))}
      </aside>
    </div>
  );
}
