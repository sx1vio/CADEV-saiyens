import {
  Bookmark,
  ExternalLink,
  MessageSquare,
  PenSquare,
  Play,
  Share2,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { QuestionCard } from '@/components/domain';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api } from '@/services';
import { POSTS } from '@/platform/data/feed';
import { JOBS } from '@/platform/data/jobs';
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
import { Ago, PostCard, companyOf } from '@/platform/ui';
import { useSession, useUI } from '@/stores/app';

/**
 * Accueil : un fil éditorial (docs/front/design-system.md). Pas de cartes : les publications
 * sont séparées par une ligne. Une publication = source, titre, extrait, image, actions.
 */

type FeedTab = 'pour-toi' | 'ia' | 'dev' | 'videos' | 'discussions';

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'pour-toi', label: 'Pour toi' },
  { id: 'discussions', label: 'Discussions' },
  { id: 'ia', label: 'IA' },
  { id: 'dev', label: 'Dev' },
  { id: 'videos', label: 'Vidéos' },
];

const CATEGORY_LABEL = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.id, c.label]));

export default function Feed() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const tab = (
    TABS.some((t) => t.id === params.get('f')) ? params.get('f') : 'pour-toi'
  ) as FeedTab;
  const home = useQuery<HomeNews>('news:home:all', () => fetchHome('all'));

  return (
    <div className="dh-page mx-auto flex w-full max-w-[1000px] justify-center gap-12 px-4 py-6 sm:px-6 sm:py-8">
      <main className="w-full max-w-[640px] min-w-0">
        <Composer />
        <Unanswered />
        <nav
          aria-label="Filtrer le fil"
          className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto border-b border-line pb-4"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={!q && tab === t.id ? 'page' : undefined}
              onClick={() => setParams(t.id === 'pour-toi' ? {} : { f: t.id }, { replace: true })}
              className={cn(
                'h-8 shrink-0 rounded-full px-3.5 text-[13.5px] font-semibold',
                !q && tab === t.id ? 'lg-tint' : 'lg-ghost text-subtle',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {q ? (
          <SearchStream q={q} onClear={() => setParams({}, { replace: true })} />
        ) : tab === 'discussions' ? (
          <Discussions />
        ) : (
          <NewsStream key={tab} tab={tab} home={home.data} homeError={home.error} />
        )}
      </main>

      <aside className="hidden w-[260px] shrink-0 xl:block">
        <div className="sticky top-8">
          <Rail home={home.data} />
        </div>
      </aside>
    </div>
  );
}

/* ---------------- S16 : « Personne n'a encore répondu » ---------------- */
/** Questions de mes stacks sans réponse, la plus urgente puis la plus ancienne d'abord. */
function Unanswered() {
  const { t } = useTranslation();
  const { data: home } = useQuery('home', () => api.getHome());
  const items = home?.unanswered.slice(0, 3) ?? [];
  if (!items.length) return null;
  return (
    <section aria-labelledby="unanswered-title" className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="unanswered-title" className="dh-title-bar">
          {t('home.unanswered')}
        </h2>
        <Link
          to="/sos?tab=unanswered"
          className="shrink-0 text-[12.5px] text-subtle hover:text-accent-text"
        >
          {t('common.seeAll')}
        </Link>
      </div>
      <p className="mt-1 text-[12.5px] text-subtle">{t('home.unansweredHint')}</p>
      <div className="mt-2 flex flex-col gap-2">
        {items.map((q) => (
          <QuestionCard key={q.id} q={q} showBlocked />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Barre de publication : une ligne ---------------- */

function Composer() {
  const me = useSession((s) => s.user);
  const setAsk = useUI((s) => s.setAsk);
  const nav = useNavigate();
  if (!me) return null;
  return (
    <div data-tour="hero" className="flex items-center gap-3">
      <Avatar name={me.displayName} src={me.avatarUrl} size={36} />
      <button
        type="button"
        onClick={() => nav('/publier')}
        className="h-10 min-w-0 flex-1 truncate rounded-full border border-line bg-surface-1 px-4 text-left text-[14px] text-subtle transition-colors hover:border-line-strong"
      >
        Quoi de neuf, {me.displayName.split(' ')[0]} ?
      </button>
      <button
        type="button"
        data-tour="hero-ask"
        onClick={() => setAsk(true)}
        className="lg-ghost hidden h-10 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-muted sm:flex"
      >
        <Zap className="size-4" />
        Je suis bloqué
      </button>
      <button
        type="button"
        onClick={() => nav('/publier?type=launch')}
        aria-label="Partager un projet"
        className="lg-ghost grid size-10 place-items-center rounded-full text-muted"
      >
        <PenSquare className="size-[18px]" />
      </button>
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
      <p className="py-10 text-[14px] text-muted">
        L’actualité n’est pas disponible pour le moment. Le reste de la plateforme fonctionne
        normalement.
      </p>
    );
  if (!home) return <PostSkeletons />;

  return (
    <div>
      {home.offline && (
        <p className="mt-4 rounded-[8px] bg-warning-soft px-3 py-2 text-[13px] text-warning">
          Hors ligne : dernières actualités enregistrées sur ton appareil.
        </p>
      )}
      {items.map((it) => (
        <FeedPost key={it.id} item={it} />
      ))}
      <div ref={sentinel} />
      {loading && <PostSkeletons n={1} />}
      {done && <p className="py-8 text-center text-[13px] text-subtle">Tu es à jour.</p>}
    </div>
  );
}

function SearchStream({ q, onClear }: { q: string; onClear: () => void }) {
  const { data, error } = useQuery<NewsItem[]>(`news:q:${q}`, () => fetchNews({ q, limit: 30 }));
  return (
    <div>
      <div className="flex items-center justify-between pt-4">
        <p className="text-[14px] text-muted">
          Articles sur <span className="dh-mono text-fg">#{q.toLowerCase()}</span>
        </p>
        <button
          type="button"
          onClick={onClear}
          className="lg-ghost inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-muted"
        >
          <X className="size-3.5" />
          Effacer
        </button>
      </div>
      {!!error && <p className="py-8 text-[14px] text-muted">Recherche indisponible.</p>}
      {!data && !error && <PostSkeletons n={2} />}
      {data?.length === 0 && <p className="py-8 text-[14px] text-muted">Aucun article.</p>}
      {data?.map((it) => (
        <FeedPost key={it.id} item={it} />
      ))}
    </div>
  );
}

function PostSkeletons({ n = 2 }: { n?: number }) {
  return (
    <div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="border-b border-line py-6">
          <Skeleton className="h-4 w-40 rounded-[6px]" />
          <Skeleton className="mt-4 h-6 w-4/5 rounded-[6px]" />
          <Skeleton className="mt-4 aspect-[2/1] w-full rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}

function FeedPost({ item }: { item: NewsItem }) {
  const saved = usePlatform((s) => s.saved.includes(item.id));
  const toggle = usePlatform((s) => s.toggle);
  const nav = useNavigate();
  const [broken, setBroken] = useState(false);
  const video = item.kind === 'video' ? String(item.extra.videoId ?? '') : '';
  const href = video ? `/videos/yt/${video}` : item.url;
  const tag = CATEGORY_LABEL[item.category];

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: item.title, url: item.url });
      else {
        await navigator.clipboard.writeText(item.url);
        toast.success('Lien copié');
      }
    } catch {
      /* partage annulé */
    }
  };
  // Lancer une discussion DevHub sur l'article (le formulaire de publication est prérempli)
  const discuss = () =>
    nav(
      `/publier?type=news&url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}`,
    );

  const action =
    'lg-ghost inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-subtle';

  return (
    <article className="border-b border-line py-6">
      <header className="flex items-center gap-2.5 text-[13px]">
        <SourceMark item={item} size={22} />
        <span className="font-semibold text-fg">{item.sourceName}</span>
        <span className="text-subtle">
          · <Ago iso={item.publishedAt} />
        </span>
        {tag && tag !== 'Tout' && (
          <span className="dh-mono ml-auto text-subtle">#{tag.toLowerCase()}</span>
        )}
      </header>

      <Wrap internal={!!video} href={href} className="group mt-3 block">
        <h2 className="text-[19px] leading-[1.3] font-semibold tracking-[-0.011em] text-fg group-hover:text-accent-text">
          {item.title}
        </h2>
        {item.summary && (
          <p className="mt-2 line-clamp-3 text-[15px] leading-[1.55] text-muted">{item.summary}</p>
        )}
      </Wrap>

      {item.image && !broken && (
        <Wrap
          internal={!!video}
          href={href}
          className="relative mt-4 block overflow-hidden rounded-[10px] bg-surface-1"
        >
          <img
            src={img(item.image, 960) ?? ''}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="aspect-[2/1] w-full object-cover"
          />
          {video && (
            <span className="absolute inset-0 grid place-items-center">
              <span className="lg-tint grid size-12 place-items-center rounded-full">
                <Play className="ml-0.5 size-5 fill-current" />
              </span>
            </span>
          )}
        </Wrap>
      )}

      <footer className="-ml-2.5 mt-3 flex items-center gap-1">
        <button type="button" onClick={discuss} className={action}>
          <MessageSquare className="size-4" />
          Discuter
        </button>
        <button
          type="button"
          aria-pressed={saved}
          onClick={() => toggle('saved', item.id)}
          className={cn(action, saved && 'text-accent-text')}
        >
          <Bookmark className={cn('size-4', saved && 'fill-current')} />
          {saved ? 'Enregistré' : 'Enregistrer'}
        </button>
        <button type="button" onClick={share} className={action}>
          <Share2 className="size-4" />
          Partager
        </button>
        <Wrap
          internal={!!video}
          href={href}
          className={cn(action, 'ml-auto hidden sm:inline-flex')}
        >
          {video ? <Play className="size-4" /> : <ExternalLink className="size-4" />}
          <span className="dh-mono">{video ? 'Regarder' : domainOf(item.url)}</span>
        </Wrap>
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

/* ---------------- Discussions de la communauté ---------------- */

function Discussions() {
  const myPosts = usePlatform((s) => s.myPosts);
  const posts = useMemo(
    () => [...myPosts, ...POSTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [myPosts],
  );
  return (
    <div className="flex flex-col gap-3 pt-4">
      <p className="text-[13px] text-subtle">
        Les publications marquées « démo » sont des exemples, en attendant celles de la communauté.
      </p>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

/* ---------------- Rail de droite : tendances, discussions, emplois ---------------- */

/** Sujets suivis : comptés sur les vrais titres de l'actualité collectée (aucun chiffre inventé). */
const TOPICS: { tag: string; re: RegExp }[] = [
  { tag: 'claude', re: /\b(claude|anthropic)\b/i },
  { tag: 'openai', re: /\b(openai|chatgpt|gpt-?\d)/i },
  { tag: 'gemini', re: /\b(gemini|deepmind)\b/i },
  { tag: 'apple', re: /\b(apple|iphone|ios|macos)\b/i },
  { tag: 'android', re: /\b(android|pixel|galaxy)\b/i },
  { tag: 'react', re: /\b(react|next\.?js)\b/i },
  { tag: 'rust', re: /\brust\b/i },
  { tag: 'python', re: /\bpython\b/i },
  { tag: 'securite', re: /(faille|security|sécurité|vulnerab|ransomware|cyber)/i },
  { tag: 'cloud', re: /\b(aws|azure|cloud|kubernetes|docker)\b/i },
];

function trends(home: HomeNews) {
  const ids = new Set<string>();
  const unique = [...home.hero, ...Object.values(home.sections).flat(), ...home.videos].filter(
    (i) => (ids.has(i.id) ? false : (ids.add(i.id), true)),
  );
  return TOPICS.map((t) => ({
    tag: t.tag,
    n: unique.filter((i) => t.re.test(`${i.title} ${i.summary}`)).length,
  }))
    .filter((t) => t.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
}

function Rail({ home }: { home?: HomeNews }) {
  if (!home) return <Skeleton className="h-[320px] rounded-[10px]" />;
  const top = trends(home);
  const talks = home.hn.filter((h) => h.comments > 0).slice(0, 3);
  return (
    <div className="flex flex-col gap-6 text-[13.5px]">
      {top.length > 0 && (
        <section>
          <h2 className="dh-title-bar">Tendances</h2>
          <ul className="mt-2">
            {top.map((t) => (
              <li key={t.tag}>
                <Link
                  to={`/?q=${t.tag}`}
                  className="flex items-baseline justify-between py-1.5 hover:text-accent-text"
                >
                  <span className="dh-mono text-fg">#{t.tag}</span>
                  <span className="text-[12.5px] text-subtle tabular">
                    {t.n} article{t.n > 1 ? 's' : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {talks.length > 0 && (
        <section className="border-t border-line pt-5">
          <h2 className="dh-title-bar">Ça discute</h2>
          <ul className="mt-2 flex flex-col gap-3">
            {talks.map((h) => (
              <li key={h.id}>
                <a href={h.url} target="_blank" rel="noopener noreferrer" className="group block">
                  <span className="line-clamp-2 leading-snug font-medium text-fg group-hover:text-accent-text">
                    {h.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-subtle">
                    {h.comments} commentaires · Hacker News
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-line pt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="dh-title-bar">Emplois</h2>
          <Link to="/emplois" className="text-[12.5px] text-subtle hover:text-accent-text">
            Tout voir
          </Link>
        </div>
        <ul className="mt-2 flex flex-col gap-3">
          {JOBS.slice(0, 2).map((j) => (
            <li key={j.id}>
              <Link to={`/emplois/${j.id}`} className="group block">
                <span className="block leading-snug font-medium text-fg group-hover:text-accent-text">
                  {j.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-subtle">
                  {companyOf(j.company).name} · {j.city} · démo
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="border-t border-line pt-5 text-[12px] text-subtle">
        {home.sources} sources suivies
        {home.updatedAt && (
          <>
            {' '}
            · mise à jour <Ago iso={home.updatedAt} />
          </>
        )}{' '}
        ·{' '}
        <Link to="/sources" className="text-muted hover:text-accent-text">
          sources
        </Link>
      </p>
    </div>
  );
}
