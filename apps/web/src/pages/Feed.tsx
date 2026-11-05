import { CheckCircle2, Inbox, Layers, Plus, Search, Sparkles, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { QuestionCard } from '@/components/domain';
import { useTags } from '@/components/TagPicker';
import { Sheet } from '@/components/ui/overlay';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { relativeTime, useLang } from '@/i18n';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api, type QuestionTab } from '@/services';
import { PostCard, communityApi } from '@/platform/community';
import { COMMUNITIES } from '@/platform/data/feed';
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
import { Ago } from '@/platform/ui';
import { useSession, useUI } from '@/stores/app';
import {
  ArrowSquareOut,
  BookmarkSimple,
  ChatCircle,
  DeviceMobile,
  FolderSimple,
  Lightning,
  Faders,
  PencilSimple,
  Play as PlayFill,
  ShareNetwork,
} from '@phosphor-icons/react';

/**
 * Accueil (v3, 05/11/2026) : trois colonnes façon réseau professionnel.
 * Gauche : moi et mes centres d'intérêt. Centre : le fil (publications, questions d'entraide,
 * actualité). Droite : ce qui se passe en direct, des devs à rencontrer, des offres.
 * L'entraide (ancienne page /sos) vit ici, dans l'onglet « Questions ».
 */

type FeedTab = 'pour-toi' | 'questions' | 'actu';

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'pour-toi', label: 'Pour toi' },
  { id: 'questions', label: 'Questions' },
  { id: 'actu', label: 'Actualité' },
];

const CATEGORY_LABEL = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.id, c.label]));

export default function Feed() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const raw = params.get('f');
  const tab: FeedTab = raw === 'questions' || raw === 'actu' ? raw : 'pour-toi';
  const setTab = (t: FeedTab) => setParams(t === 'pour-toi' ? {} : { f: t }, { replace: true });

  const [filters, setFilters] = useState(() => {
    try {
      return localStorage.getItem('dh-feed-filters') !== '0';
    } catch {
      return true;
    }
  });
  const showFilters = (v: boolean) => {
    setFilters(v);
    try {
      localStorage.setItem('dh-feed-filters', v ? '1' : '0');
    } catch {
      /* stockage indisponible : le choix vaut pour la session */
    }
  };
  const withFilters = filters && !q && tab === 'pour-toi';

  return (
    <div
      className={cn(
        'dh-page mx-auto grid w-full gap-6 px-4 py-6 sm:px-6',
        withFilters
          ? 'max-w-[1340px] lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-8'
          : 'max-w-[1000px]',
      )}
    >
      <main className="min-w-0">
        <Composer />
        <nav
          aria-label="Filtrer le fil"
          className="mt-4 flex items-center gap-1 border-b border-line"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={!q && tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
              className={cn(
                '-mb-px h-12 border-b-2 px-4 text-[15px] transition-colors',
                !q && tab === t.id
                  ? 'border-fg font-medium text-fg'
                  : 'border-transparent text-subtle hover:text-fg',
              )}
            >
              {t.label}
            </button>
          ))}
          {!q && tab === 'pour-toi' && (
            <button
              type="button"
              aria-pressed={filters}
              onClick={() => showFilters(!filters)}
              className={cn(
                'ml-auto mb-1.5 hidden h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium lg:inline-flex',
                filters ? 'lg-tint' : 'lg-clear',
              )}
            >
              <Faders className="size-4" weight="fill" />
              Filtres
            </button>
          )}
        </nav>

        {q ? (
          <SearchStream q={q} onClear={() => setParams({}, { replace: true })} />
        ) : tab === 'questions' ? (
          <Questions />
        ) : tab === 'actu' ? (
          <NewsStream />
        ) : (
          <ForYou />
        )}
      </main>

      {withFilters && (
        <aside className="hidden lg:block">
          <div className="sticky top-20 flex flex-col gap-3">
            <FeedFilters onHide={() => showFilters(false)} />
          </div>
        </aside>
      )}
    </div>
  );
}

export function InterestsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const joined = usePlatform((s) => s.joined);
  const toggle = usePlatform((s) => s.toggle);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Mes centres d’intérêt">
      <p className="text-[13.5px] text-muted">
        Ton fil « Pour toi » ne garde que ces sujets. Tu peux en changer quand tu veux.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {COMMUNITIES.map((c) => {
          const on = joined.includes(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              aria-pressed={on}
              onClick={() => toggle('joined', c.slug)}
              className={cn(
                'flex items-start gap-3 rounded-[10px] border p-3 text-left transition-colors',
                on ? 'border-fg bg-surface-2' : 'border-line hover:border-line-strong',
              )}
            >
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-fg">{c.name}</span>
                <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted">
                  {c.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ---------------- Barre de publication ---------------- */

function Composer() {
  const me = useSession((s) => s.user);
  const setAsk = useUI((s) => s.setAsk);
  const nav = useNavigate();
  if (!me) return null;
  const action =
    'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[8px] px-2 text-[14px] font-medium whitespace-nowrap text-fg transition-colors hover:bg-surface-2';
  return (
    <section data-tour="hero" className="dh-panel px-4 pt-4 pb-2">
      <div className="flex items-center gap-3">
        <Avatar name={me.displayName} src={me.avatarUrl} size={48} />
        <button
          type="button"
          onClick={() => nav('/publier')}
          className="lg-clear h-12 min-w-0 flex-1 truncate rounded-full px-5 text-left text-[15px] font-medium text-subtle"
        >
          Partage une avancée, un projet, une question
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <button type="button" data-tour="hero-ask" onClick={() => setAsk(true)} className={action}>
          <Lightning className="size-[22px] text-fg" />
          Je suis bloqué
        </button>
        <button type="button" onClick={() => nav('/publier?type=launch')} className={action}>
          <FolderSimple className="size-[22px] text-fg" />
          Un projet
        </button>
        <button type="button" onClick={() => nav('/banc')} className={action}>
          <DeviceMobile className="size-[22px] text-fg" />
          Faire tester
        </button>
      </div>
    </section>
  );
}

/* ---------------- Pour toi : un vrai fil (actualité + publications + questions) ---------------- */

/** Centre d'intérêt → rubriques de l'actualité collectée. */
const TOPIC_NEWS: Record<string, string[]> = {
  ia: ['ia'],
  web: ['dev', 'tech'],
  mobile: ['mobile', 'apple', 'google', 'samsung'],
  backend: ['dev', 'cloud'],
  devops: ['cloud', 'dev'],
  data: ['ia', 'cloud'],
  opensource: ['dev'],
  carriere: ['afrique', 'tech'],
  fintech: ['afrique'],
  showcase: [],
};

type Entry =
  | { kind: 'news'; at: string; item: NewsItem }
  | { kind: 'post'; at: string; post: Parameters<typeof PostCard>[0]['post'] };

function ForYou() {
  const [params] = useSearchParams();
  const kind = params.get('type') ?? '';
  const lang = params.get('lang') ?? '';
  const rawTopic = params.get('topic') ?? '';
  const topic = rawTopic === 'une' ? '' : rawTopic;
  const joined = usePlatform((s) => s.joined);
  const home = useQuery<HomeNews>('news:home:all', () => fetchHome('all'));
  const posts = useQuery(`posts:feed:recent:${topic}`, () =>
    communityApi.list({ sort: 'recent', community: topic || undefined }),
  );
  const [more, setMore] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const topics = topic ? [topic] : joined;
  const wanted = new Set(topics.flatMap((x) => TOPIC_NEWS[x] ?? []));

  const entries = useMemo<Entry[]>(() => {
    if (!home.data) return [];
    const seen = new Set<string>();
    const news = [
      ...home.data.hero,
      ...Object.entries(home.data.sections)
        .filter(([k]) => wanted.size === 0 || wanted.has(k))
        .flatMap(([, v]) => v),
      ...home.data.videos,
      ...more,
    ].filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
    const mine = (posts.data?.data ?? []).filter(
      (p) => topics.length === 0 || topics.includes(p.community),
    );
    const keepNews = news.filter(
      (i) =>
        (!lang || i.lang === lang) &&
        (kind === '' ||
          (kind === 'video' ? i.kind === 'video' : kind === 'article' && i.kind !== 'video')),
    );
    return [
      ...(kind === 'post' ? [] : keepNews).map((item) => ({
        kind: 'news' as const,
        at: item.publishedAt,
        item,
      })),
      ...(kind === '' || kind === 'post' ? mine : []).map((post) => ({
        kind: 'post' as const,
        at: post.createdAt,
        post,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home.data, posts.data, more, topic, joined, kind, lang]);

  // Défilement infini : la suite de l'actualité se charge en approchant du bas
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !home.data || done) return;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting || loading) return;
        const oldest = entries.filter((e) => e.kind === 'news').at(-1)?.at;
        if (!oldest) return;
        setLoading(true);
        try {
          const next = await fetchNews({ kind: 'article', before: oldest, limit: PAGE });
          if (next.length === 0) setDone(true);
          setMore((m) => [...m, ...next]);
        } catch {
          setDone(true);
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: '800px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [home.data, entries, loading, done]);

  if (rawTopic === 'une') return <Headlines />;

  return (
    <div className="flex flex-col gap-3 pt-4">
      <TopicChips />
      {!home.data && !home.error && <PostSkeletons n={3} />}
      {!home.data && !!home.error && (
        <p className="dh-panel p-6 text-[15px] text-muted">
          L’actualité n’est pas disponible pour le moment. Réessaie dans un instant.
        </p>
      )}
      {entries.map((e, i) => (
        <div key={e.kind === 'news' ? e.item.id : e.post.id} className="contents">
          {e.kind === 'news' ? <FeedPost item={e.item} /> : <PostCard post={e.post} />}
          {i === 1 && <NeedsYou />}
        </div>
      ))}
      <div ref={sentinel} />
      {loading && <PostSkeletons n={1} />}
      {done && <p className="py-6 text-center text-[14px] text-subtle">Tu es à jour</p>}
    </div>
  );
}

function TopicChips() {
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') ?? '';
  const joined = usePlatform((s) => s.joined);
  const [editing, setEditing] = useState(false);
  const chips = COMMUNITIES.filter((c) => joined.includes(c.slug) || c.slug === topic);
  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
      <Chip active={!topic} onClick={() => setParams({}, { replace: true })}>
        {joined.length ? 'Mes sujets' : 'Tout'}
      </Chip>
      <Chip active={topic === 'une'} onClick={() => setParams({ topic: 'une' }, { replace: true })}>
        À la une
      </Chip>
      {chips.map((c) => (
        <Chip
          key={c.slug}
          active={topic === c.slug}
          onClick={() => setParams({ topic: c.slug }, { replace: true })}
        >
          {c.name}
        </Chip>
      ))}
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Choisir mes sujets"
        className="lg-clear grid size-9 shrink-0 place-items-center rounded-full text-fg"
      >
        <PencilSimple className="size-4" weight="fill" />
      </button>
      <InterestsSheet open={editing} onOpenChange={setEditing} />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors',
        active ? 'lg-tint' : 'lg-clear',
      )}
    >
      {children}
    </button>
  );
}

/** Questions de mes stacks sans réponse : là où je suis utile tout de suite. */
function NeedsYou() {
  const { data: home } = useQuery('home', () => api.getHome());
  const items = (
    home?.openInMyStacks.length ? home.openInMyStacks : (home?.unanswered ?? [])
  ).slice(0, 2);
  if (!items.length) return null;
  return (
    <section aria-labelledby="needs-you" className="dh-panel p-4">
      <div className="flex items-center justify-between px-1">
        <h2 id="needs-you" className="text-[16px] font-semibold text-fg">
          {home?.openInMyStacks.length ? 'Ils ont besoin de toi' : 'Personne n’a encore répondu'}
        </h2>
        <Link to="/?f=questions" className="text-[14px] text-accent-text hover:underline">
          Toutes les questions
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {items.map((q) => (
          <QuestionCard key={q.id} q={q} showBlocked className="shadow-none" />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Questions (ancienne entraide) ---------------- */

function Questions() {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const setAsk = useUI((s) => s.setAsk);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as QuestionTab) || (me ? 'for-me' : 'all');
  const tag = params.get('tag') ?? '';
  const [q, setQ] = useState(params.get('qq') ?? '');
  const { data: tags = [] } = useTags();
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q) next.set('qq', q);
      else next.delete('qq');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 250);
    return () => clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set('f', 'questions');
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const { data, error } = useQuery(`questions:${tab}:${tag}:${params.get('qq') ?? ''}`, () =>
    api.listQuestions(tab, { tag: tag || undefined, q: params.get('qq') || undefined }),
  );
  const tabs = [
    ...(me ? [{ value: 'for-me' as const, label: t('sos.tabs.for-me'), icon: Sparkles }] : []),
    { value: 'unanswered' as const, label: t('sos.tabs.unanswered'), icon: Inbox },
    { value: 'resolved' as const, label: t('sos.tabs.resolved'), icon: CheckCircle2 },
    { value: 'all' as const, label: t('sos.tabs.all'), icon: Layers },
    ...(me ? [{ value: 'mine' as const, label: t('sos.tabs.mine'), icon: UserRound }] : []),
  ];
  return (
    <div className="flex flex-col gap-3 pt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher une erreur, une stack"
            aria-label={t('common.search')}
            className="h-10 w-full rounded-[10px] border border-line bg-surface-1 pr-3 pl-9 text-[14px] text-fg placeholder:text-subtle focus:border-fg focus:outline-none"
          />
        </label>
        <select
          value={tag}
          onChange={(e) => set('tag', e.target.value)}
          aria-label={t('sos.filterTag')}
          className="h-10 rounded-[10px] border border-line bg-surface-1 px-3 text-[14px] text-fg focus:border-fg focus:outline-none sm:w-48"
        >
          <option value="">{t('sos.allTags')}</option>
          {tags.map((x) => (
            <option key={x.id} value={x.slug}>
              {x.label}
            </option>
          ))}
        </select>
        {me && (
          <button
            type="button"
            onClick={() => setAsk(true)}
            className="lg-tint inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium"
          >
            <Plus className="size-4" />
            Poser une question
          </button>
        )}
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {tabs.map((x) => (
          <button
            key={x.value}
            type="button"
            aria-pressed={tab === x.value}
            onClick={() => set('tab', x.value)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors',
              tab === x.value
                ? 'border-fg bg-fg text-canvas'
                : 'border-line-strong text-muted hover:border-fg hover:text-fg',
            )}
          >
            <x.icon className="size-3.5" />
            {x.label}
          </button>
        ))}
      </div>
      {!data && !error && <PostSkeletons />}
      {!!error && !data && (
        <p className="dh-panel p-6 text-center text-muted">Impossible de charger les questions.</p>
      )}
      {data?.map((x) => (
        <QuestionCard key={x.id} q={x} showBlocked={tab !== 'resolved'} />
      ))}
      {data?.length === 0 && (
        <div className="dh-panel p-8 text-center">
          <p className="font-medium text-fg">{t('sos.empty.title')}</p>
          <p className="mt-1 text-[14px] text-muted">{t('sos.empty.text')}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Actualité ---------------- */

const PAGE = 12;
type NewsTab = 'all' | 'ia' | 'dev' | 'videos';

function firstItems(tab: NewsTab, home: HomeNews): NewsItem[] {
  if (tab === 'videos') return home.videos;
  if (tab === 'ia' || tab === 'dev') return home.sections[tab] ?? [];
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

function NewsStream() {
  const [tab, setTab] = useState<NewsTab>('all');
  const home = useQuery<HomeNews>('news:home:all', () => fetchHome('all'));
  const [more, setMore] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    if (!home.data) return [];
    const base = firstItems(tab, home.data);
    const ids = new Set(base.map((i) => i.id));
    return [...base, ...more.filter((m) => !ids.has(m.id))];
  }, [home.data, tab, more]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !home.data || done) return;
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
  }, [home.data, items, tab, loading, done]);

  const switchTab = (t: NewsTab) => {
    setTab(t);
    setMore([]);
    setDone(false);
  };

  return (
    <div className="flex flex-col gap-3 pt-4">
      <div className="flex gap-1.5">
        {(
          [
            ['all', 'Tout'],
            ['ia', 'IA'],
            ['dev', 'Dev'],
            ['videos', 'Vidéos'],
          ] as const
        ).map(([k, l]) => (
          <Chip key={k} active={tab === k} onClick={() => switchTab(k)}>
            {l}
          </Chip>
        ))}
      </div>
      {!home.data && home.error ? (
        <p className="dh-panel p-6 text-[14px] text-muted">
          L’actualité n’est pas disponible pour le moment. Le reste de la plateforme fonctionne
          normalement.
        </p>
      ) : !home.data ? (
        <PostSkeletons />
      ) : (
        <>
          {home.data.offline && (
            <p className="rounded-[8px] bg-warning-soft px-3 py-2 text-[13px] text-warning">
              Hors ligne : dernières actualités enregistrées sur ton appareil.
            </p>
          )}
          {items.map((it) => (
            <FeedPost key={it.id} item={it} />
          ))}
          {items.length === 0 && (
            <p className="dh-panel p-6 text-[14px] text-muted">
              Aucune actualité collectée pour l’instant.
            </p>
          )}
          <div ref={sentinel} />
          {loading && <PostSkeletons n={1} />}
          {done && <p className="py-6 text-center text-[13px] text-subtle">Tu es à jour</p>}
        </>
      )}
    </div>
  );
}

function SearchStream({ q, onClear }: { q: string; onClear: () => void }) {
  const { data, error } = useQuery<NewsItem[]>(`news:q:${q}`, () => fetchNews({ q, limit: 30 }));
  return (
    <div className="flex flex-col gap-3 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-muted">
          Articles sur <span className="dh-mono text-fg">#{q.toLowerCase()}</span>
        </p>
        <button
          type="button"
          onClick={onClear}
          className="lg-ghost inline-flex h-8 items-center gap-1 rounded-[8px] px-3 text-[13px] text-muted"
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
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="dh-panel p-4">
          <Skeleton className="h-4 w-40 rounded-[6px]" />
          <Skeleton className="mt-4 h-5 w-4/5 rounded-[6px]" />
          <Skeleton className="mt-3 h-4 w-3/5 rounded-[6px]" />
        </div>
      ))}
    </>
  );
}

function FeedPost({ item }: { item: NewsItem }) {
  const saved = usePlatform((s) => s.saved.includes(item.id));
  const toggle = usePlatform((s) => s.toggle);
  const nav = useNavigate();
  const [broken, setBroken] = useState(false);
  const video = item.kind === 'video' ? String(item.extra.videoId ?? '') : '';
  const href = video ? `https://www.youtube.com/watch?v=${video}` : item.url;
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
  const discuss = () =>
    nav(
      `/publier?type=news&url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}`,
    );
  const action =
    'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[8px] text-[14px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg';

  return (
    <article className="dh-panel overflow-hidden">
      <header className="flex items-center gap-3 px-4 pt-4">
        <SourceMark item={item} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-fg">{item.sourceName}</p>
          <p className="truncate text-[13px] text-subtle">
            {tag && tag !== 'Tout' ? `${tag} · ` : ''}
            <Ago iso={item.publishedAt} />
            {item.author ? ` · ${item.author}` : ''}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? 'Retirer des enregistrés' : 'Enregistrer'}
          onClick={() => toggle('saved', item.id)}
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-2',
            saved && 'text-accent-text',
          )}
        >
          <BookmarkSimple weight={saved ? 'fill' : 'bold'} className="size-5" />
        </button>
      </header>
      <a href={href} target="_blank" rel="noopener noreferrer" className="group block px-4 pt-3">
        <h2 className="font-sans text-[18px] leading-[1.4] font-semibold tracking-normal text-fg group-hover:text-accent-text">
          {item.title}
        </h2>
        {item.summary && (
          <p className="mt-1.5 line-clamp-3 text-[15px] leading-[1.6] text-muted">{item.summary}</p>
        )}
      </a>
      {item.image && !broken && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-3 block bg-surface-2"
        >
          <img
            src={img(item.image, 1200) ?? ''}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="aspect-[2.2/1] max-h-[440px] w-full object-cover"
          />
          {video && (
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-16 place-items-center rounded-full bg-black/70 text-white">
                <PlayFill weight="fill" className="ml-1 size-7" />
              </span>
            </span>
          )}
        </a>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 border-b border-line bg-surface-inset px-4 py-2.5 text-[13px] text-subtle hover:text-fg"
      >
        {video ? (
          <PlayFill weight="fill" className="size-4" />
        ) : (
          <ArrowSquareOut weight="bold" className="size-4" />
        )}
        <span className="truncate">{video ? 'youtube.com' : domainOf(item.url)}</span>
      </a>
      <footer className="flex items-center gap-1 px-2 py-1">
        <button type="button" onClick={discuss} className={action}>
          <ChatCircle weight="fill" className="size-5" />
          Discuter
        </button>
        <button type="button" onClick={share} className={action}>
          <ShareNetwork weight="fill" className="size-5" />
          Partager
        </button>
        <a href={href} target="_blank" rel="noopener noreferrer" className={action}>
          {video ? (
            <PlayFill weight="fill" className="size-5" />
          ) : (
            <ArrowSquareOut weight="bold" className="size-5" />
          )}
          {video ? 'Regarder' : 'Lire'}
        </a>
      </footer>
    </article>
  );
}

/* ---------------- Colonne de droite ---------------- */

/** « À la une » : les titres du moment (une de l'actualité + le plus récent de chaque rubrique). */
function Headlines() {
  const lang = useLang();
  const { data, error } = useQuery<HomeNews>('news:home:all', () => fetchHome('all'));
  const seen = new Set<string>();
  const list = data
    ? [
        ...data.hero,
        ...Object.values(data.sections)
          .map((v) => v[0])
          .filter(Boolean),
      ]
        .filter((i): i is NewsItem => !!i && (seen.has(i.id) ? false : (seen.add(i.id), true)))
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    : [];
  const talks = data?.hn.filter((h) => h.comments > 0).slice(0, 5) ?? [];
  return (
    <div className="flex flex-col gap-3 pt-4">
      <TopicChips />
      {!data && !error && <PostSkeletons n={2} />}
      {talks.length > 0 && (
        <section className="dh-panel p-4">
          <h2 className="font-sans text-[17px] font-semibold tracking-normal text-fg">
            Ça discute chez les devs
          </h2>
          <ol className="mt-2 flex flex-col">
            {talks.map((h, i) => (
              <li key={h.id}>
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-mx-2 flex gap-3 rounded-[8px] px-2 py-2.5 hover:bg-surface-2"
                >
                  <span className="w-5 shrink-0 text-[15px] font-semibold text-fg tabular">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-snug font-medium text-fg">
                      {h.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {h.comments} commentaires · {relativeTime(h.publishedAt, lang)} · Hacker News
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
      {list.map((it) => (
        <FeedPost key={it.id} item={it} />
      ))}
    </div>
  );
}

/** Filtres du fil : type de contenu, langue et centres d'intérêt, en un seul endroit. */
function FeedFilters({ onHide }: { onHide: () => void }) {
  const [params, setParams] = useSearchParams();
  const joined = usePlatform((s) => s.joined);
  const toggle = usePlatform((s) => s.toggle);
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.delete('f');
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const type = params.get('type') ?? '';
  const lang = params.get('lang') ?? '';
  const Option = ({
    on,
    onClick,
    children,
  }: {
    on: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'h-9 rounded-full px-3.5 text-[14px] font-medium transition-colors',
        on ? 'lg-tint' : 'lg-clear',
      )}
    >
      {children}
    </button>
  );
  return (
    <section className="dh-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-[17px] font-semibold tracking-normal text-fg">Filtres</h2>
        <span className="flex items-center gap-1">
          {(type || lang) && (
            <button
              type="button"
              onClick={() => setParams({}, { replace: true })}
              className="h-8 rounded-full px-2.5 text-[13.5px] font-medium text-accent-text hover:bg-surface-2"
            >
              Réinitialiser
            </button>
          )}
          <button
            type="button"
            onClick={onHide}
            aria-label="Masquer les filtres"
            className="grid size-8 place-items-center rounded-full text-fg hover:bg-surface-2"
          >
            <X className="size-4" />
          </button>
        </span>
      </div>
      <p className="mt-3 text-[13.5px] font-semibold text-fg">Contenu</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(
          [
            ['', 'Tout'],
            ['article', 'Articles'],
            ['video', 'Vidéos'],
            ['post', 'Publications'],
          ] as const
        ).map(([k, l]) => (
          <Option key={k} on={type === k} onClick={() => set('type', k)}>
            {l}
          </Option>
        ))}
      </div>
      <p className="mt-4 text-[13.5px] font-semibold text-fg">Langue</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(
          [
            ['', 'Toutes'],
            ['fr', 'Français'],
            ['en', 'Anglais'],
          ] as const
        ).map(([k, l]) => (
          <Option key={k} on={lang === k} onClick={() => set('lang', k)}>
            {l}
          </Option>
        ))}
      </div>
      <p className="mt-4 text-[13.5px] font-semibold text-fg">Centres d’intérêt</p>
      <ul className="mt-1.5 flex flex-col">
        {COMMUNITIES.map((c) => {
          const on = joined.includes(c.slug);
          return (
            <li key={c.slug}>
              <label className="-mx-2 flex h-10 cursor-pointer items-center gap-3 rounded-[8px] px-2 text-[14.5px] text-fg hover:bg-surface-2/70">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle('joined', c.slug)}
                  className="size-[18px] accent-[var(--accent)]"
                />
                {c.name}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
