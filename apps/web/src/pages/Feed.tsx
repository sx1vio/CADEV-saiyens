import { Bookmark, ExternalLink, Play, Share2, Zap, PenSquare } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { POSTS } from '@/platform/data/feed';
import {
  NEWS_CATEGORIES,
  domainOf,
  fetchHome,
  fetchNews,
  img,
  type HomeNews,
  type NewsItem,
} from '@/platform/news';
import { SourceMark } from '@/platform/newsui';
import { usePlatform } from '@/platform/store';
import { Ago, PostCard } from '@/platform/ui';
import { useSession, useUI } from '@/stores/app';

/**
 * Accueil : un fil unique, façon Facebook. Une publication = une source, un titre, un court
 * extrait, une image, et trois actions (lire, enregistrer, partager). Pas de réactions.
 * Une seule chose à lire à la fois ; le reste de la plateforme est dans le menu.
 */

type FeedTab = 'pour-toi' | 'ia' | 'dev' | 'videos' | 'communaute';

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'pour-toi', label: 'Pour toi' },
  { id: 'ia', label: 'IA' },
  { id: 'dev', label: 'Dev' },
  { id: 'videos', label: 'Vidéos' },
  { id: 'communaute', label: 'Communauté' },
];

const CATEGORY_LABEL = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.id, c.label]));

export default function Feed() {
  const [params, setParams] = useSearchParams();
  const tab = (
    TABS.some((t) => t.id === params.get('f')) ? params.get('f') : 'pour-toi'
  ) as FeedTab;
  const home = useQuery<HomeNews>('news:home:all', () => fetchHome('all'));

  return (
    <div className="dh-page mx-auto flex w-full max-w-[1080px] justify-center gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <main className="w-full max-w-[620px] min-w-0">
        <Composer />
        <nav
          aria-label="Filtrer le fil"
          className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-b border-line"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setParams(t.id === 'pour-toi' ? {} : { f: t.id }, { replace: true })}
              className={cn(
                '-mb-px shrink-0 border-b-2 px-3.5 pt-1 pb-3 text-[14px] font-semibold transition-colors',
                tab === t.id
                  ? 'border-accent text-fg'
                  : 'border-transparent text-subtle hover:text-fg',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-5">
          {tab === 'communaute' ? (
            <CommunityStream />
          ) : (
            <NewsStream key={tab} tab={tab} home={home.data} homeError={home.error} />
          )}
        </div>
      </main>

      <aside className="hidden w-[300px] shrink-0 xl:block">
        <div className="sticky top-6">
          <Brief home={home.data} />
        </div>
      </aside>
    </div>
  );
}

/* ---------------- Barre de publication ---------------- */

function Composer() {
  const me = useSession((s) => s.user);
  const setAsk = useUI((s) => s.setAsk);
  const nav = useNavigate();
  if (!me) return null;
  const first = me.displayName.split(' ')[0];
  return (
    <div data-tour="hero" className="dh-card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={me.displayName} src={me.avatarUrl} size={40} />
        <button
          type="button"
          onClick={() => nav('/publier')}
          className="h-11 min-w-0 flex-1 truncate rounded-full bg-surface-2 px-4 text-left text-[14.5px] text-subtle transition-colors hover:bg-surface-3"
        >
          Quoi de neuf, {first} ?
        </button>
      </div>
      <div className="mt-3 flex gap-1 border-t border-line pt-2">
        <button
          type="button"
          data-tour="hero-ask"
          onClick={() => setAsk(true)}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold text-muted hover:bg-surface-2 hover:text-fg"
        >
          <Zap className="size-[18px] text-warning" />
          Je suis bloqué
        </button>
        <button
          type="button"
          onClick={() => nav('/publier?type=launch')}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold text-muted hover:bg-surface-2 hover:text-fg"
        >
          <PenSquare className="size-[18px] text-accent-text" />
          Partager un projet
        </button>
      </div>
    </div>
  );
}

/* ---------------- Fil d'actualité ---------------- */

const PAGE = 12;

function firstItems(tab: FeedTab, home: HomeNews): NewsItem[] {
  if (tab === 'videos') return home.videos;
  if (tab === 'ia' || tab === 'dev') return home.sections[tab] ?? [];
  // « Pour toi » : la une, puis le plus récent de chaque rubrique ; une vidéo toutes les 5 publications
  const seen = new Set<string>();
  const articles = [
    ...home.hero,
    ...Object.values(home.sections)
      .flat()
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  ].filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  const out: NewsItem[] = [];
  articles.slice(0, 20).forEach((a, i) => {
    out.push(a);
    const v = home.videos[(i + 1) / 5 - 1];
    if ((i + 1) % 5 === 0 && v) out.push(v);
  });
  return out;
}

function NewsStream({
  tab,
  home,
  homeError,
}: {
  tab: FeedTab;
  home?: HomeNews;
  homeError: unknown;
}) {
  const [more, setMore] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    if (!home) return [];
    const base = firstItems(tab, home);
    const ids = new Set(base.map((i) => i.id));
    return [...base, ...more.filter((m) => !ids.has(m.id))];
  }, [home, tab, more]);

  // Défilement infini : la suite se charge quand on approche du bas du fil
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !home || done) return;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting || loading) return;
        const last = [...items].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))[0];
        if (!last) return;
        setLoading(true);
        try {
          const next = await fetchNews({
            category: tab === 'ia' || tab === 'dev' ? tab : undefined,
            kind: tab === 'videos' ? 'video' : 'article',
            before: last.publishedAt,
            limit: PAGE,
          });
          if (next.length === 0) setDone(true);
          setMore((m) => [...m, ...next]);
        } catch {
          setDone(true);
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [home, items, tab, loading, done]);

  if (!home && homeError)
    return (
      <p className="dh-card p-6 text-[14px] text-muted">
        L’actualité n’est pas disponible pour le moment. Le reste de la plateforme fonctionne
        normalement.
      </p>
    );
  if (!home)
    return (
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[420px] rounded-[20px]" />
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {home.offline && (
        <p className="rounded-[14px] bg-warning-soft px-4 py-2.5 text-[13px] text-warning">
          Hors ligne : voici les dernières actualités enregistrées sur ton appareil.
        </p>
      )}
      {items.map((it) => (
        <FeedPost key={it.id} item={it} />
      ))}
      <div ref={sentinel} />
      {loading && <Skeleton className="h-[320px] rounded-[20px]" />}
      {done && <p className="py-6 text-center text-[13px] text-subtle">Tu es à jour.</p>}
    </div>
  );
}

function FeedPost({ item }: { item: NewsItem }) {
  const saved = usePlatform((s) => s.saved.includes(item.id));
  const toggle = usePlatform((s) => s.toggle);
  const [broken, setBroken] = useState(false);
  const video = item.kind === 'video' ? String(item.extra.videoId ?? '') : '';
  const href = video ? `/videos/yt/${video}` : item.url;
  const showImage = !!item.image && !broken;

  const share = async () => {
    const data = { title: item.title, url: item.url };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(item.url);
        toast.success('Lien copié');
      }
    } catch {
      /* partage annulé */
    }
  };

  return (
    <article className="dh-card overflow-hidden">
      <header className="flex items-center gap-3 px-5 pt-4">
        <SourceMark item={item} size={40} />
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-fg">{item.sourceName}</p>
          <p className="text-[12.5px] text-subtle">
            <Ago iso={item.publishedAt} />
            {CATEGORY_LABEL[item.category] && <> · {CATEGORY_LABEL[item.category]}</>}
            {video && <> · Vidéo</>}
          </p>
        </div>
      </header>

      <Wrap internal={!!video} href={href} className="group block px-5 pt-3 pb-4">
        <h2 className="text-[17px] leading-snug font-semibold tracking-[-0.01em] text-fg group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">
          {item.title}
        </h2>
        {item.summary && (
          <p className="mt-1.5 line-clamp-3 text-[14.5px] leading-relaxed text-muted">
            {item.summary}
          </p>
        )}
      </Wrap>

      {showImage && (
        <Wrap internal={!!video} href={href} className="relative block bg-surface-2">
          <img
            src={img(item.image, 960) ?? ''}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="aspect-[16/9] w-full object-cover"
          />
          {video && (
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-14 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm">
                <Play className="ml-0.5 size-6 fill-current" />
              </span>
            </span>
          )}
        </Wrap>
      )}

      <footer className="flex items-center gap-1 px-2 py-1.5">
        <Wrap
          internal={!!video}
          href={href}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold text-muted hover:bg-surface-2 hover:text-fg"
        >
          {video ? <Play className="size-[18px]" /> : <ExternalLink className="size-[18px]" />}
          {video ? 'Regarder' : 'Lire'}
          {!video && (
            <span className="hidden truncate font-normal text-subtle sm:inline">
              sur {domainOf(item.url)}
            </span>
          )}
        </Wrap>
        <button
          type="button"
          aria-pressed={saved}
          onClick={() => toggle('saved', item.id)}
          className={cn(
            'flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold hover:bg-surface-2',
            saved ? 'text-accent-text' : 'text-muted hover:text-fg',
          )}
        >
          <Bookmark className={cn('size-[18px]', saved && 'fill-current')} />
          {saved ? 'Enregistré' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold text-muted hover:bg-surface-2 hover:text-fg"
        >
          <Share2 className="size-[18px]" />
          Partager
        </button>
      </footer>
    </article>
  );
}

/** Lien d'une publication : page vidéo de DevHub, ou article chez son éditeur (nouvel onglet). */
function Wrap({
  internal,
  href,
  className,
  children,
}: {
  internal: boolean;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return internal ? (
    <Link to={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/* ---------------- Communauté ---------------- */

function CommunityStream() {
  const myPosts = usePlatform((s) => s.myPosts);
  const posts = useMemo(
    () => [...myPosts, ...POSTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [myPosts],
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-subtle">
        Les publications marquées « démo » sont des exemples, en attendant celles de la communauté.
      </p>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

/* ---------------- Colonne de droite : l'essentiel en cinq titres ---------------- */

function Brief({ home }: { home?: HomeNews }) {
  if (!home) return <Skeleton className="h-[360px] rounded-[20px]" />;
  // Hacker News si la collecte est récente, sinon les titres à la une
  const items = (home.hn.length ? home.hn : home.hero).slice(0, 5);
  return (
    <section className="dh-card p-5">
      <h2 className="dh-title-bar text-[15px] font-bold text-fg">En bref</h2>
      <p className="mt-1 text-[12.5px] text-subtle">Ce dont les devs parlent en ce moment</p>
      <ol className="mt-4 flex flex-col gap-3.5">
        {items.map((it, i) => (
          <li key={it.id}>
            <a
              href={String(it.extra.link ?? it.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-3"
            >
              <span className="w-4 shrink-0 pt-0.5 text-[13px] font-semibold text-subtle tabular">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-[13.5px] leading-snug font-medium text-fg group-hover:underline">
                  {it.title}
                </span>
                <span className="mt-0.5 block text-[12px] text-subtle">
                  {String(it.extra.domain ?? it.sourceName)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-5 border-t border-line pt-4 text-[12px] text-subtle">
        {home.sources} sources suivies
        {home.updatedAt && (
          <>
            {' '}
            · mis à jour <Ago iso={home.updatedAt} />
          </>
        )}{' '}
        ·{' '}
        <Link to="/sources" className="font-medium text-fg hover:underline">
          Sources
        </Link>
      </p>
    </section>
  );
}
