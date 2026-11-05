import {
  Bookmark,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  Inbox,
  Layers,
  MessageSquare,
  Play,
  Plus,
  Search,
  Settings2,
  Share2,
  Smartphone,
  Sparkles,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
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
import { fetchJobs } from '@/platform/jobs';
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
import { Ago, CommunityIcon } from '@/platform/ui';
import { useSession, useUI } from '@/stores/app';

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

  return (
    <div className="dh-page mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
      <aside className="hidden xl:block">
        <div className="sticky top-20 flex flex-col gap-3">
          <MeCard />
          <Interests />
        </div>
      </aside>

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

      <aside className="hidden lg:block">
        <div className="sticky top-20 flex flex-col gap-3">
          <Headlines />
          <DevsToMeet />
          <JobsPanel />
        </div>
      </aside>
    </div>
  );
}

/* ---------------- Colonne de gauche ---------------- */

function MeCard() {
  const me = useSession((s) => s.user);
  const { data: passport } = useQuery(me ? `passport:${me.handle}` : null, () =>
    api.getPassport(me!.handle),
  );
  const badges = usePlatform((s) => Object.values(s.certResults).filter((r) => r.passed).length);
  if (!me) return null;
  return (
    <section className="dh-panel overflow-hidden">
      <div className="h-16 bg-[#1b2a4a]" aria-hidden />
      <div className="px-4 pb-4">
        <Link
          to={`/u/${me.handle}`}
          className="-mt-7 block w-fit rounded-full ring-4 ring-surface-1"
        >
          <Avatar name={me.displayName} src={me.avatarUrl} size={56} />
        </Link>
        <Link
          to={`/u/${me.handle}`}
          className="mt-2 block text-[17px] font-semibold text-fg hover:underline"
        >
          {me.displayName}
        </Link>
        <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-muted">
          {me.bio || `@${me.handle}${me.city ? ` · ${me.city}` : ''}`}
        </p>
      </div>
      <dl className="grid grid-cols-3 border-t border-line text-center">
        {[
          ['Proof XP', passport?.totalXp],
          ['Badges', badges],
          ['Projets', passport?.rooms.length],
        ].map(([label, v]) => (
          <div key={label as string} className="py-2.5 [&+&]:border-l [&+&]:border-line">
            <dt className="text-[12px] text-subtle">{label}</dt>
            <dd className="mt-0.5 text-[16px] font-semibold text-fg tabular">{v ?? '–'}</dd>
          </div>
        ))}
      </dl>
      <Link
        to={`/u/${me.handle}`}
        className="flex h-10 items-center justify-center gap-1.5 border-t border-line text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <UserRound className="size-4" />
        Voir mon profil
      </Link>
    </section>
  );
}

/** Centres d'intérêt : remplacent les communautés. Ils filtrent le fil « Pour toi ». */
function Interests() {
  const joined = usePlatform((s) => s.joined);
  const [open, setOpen] = useState(false);
  const [params] = useSearchParams();
  const topic = params.get('topic');
  const picked = COMMUNITIES.filter((c) => joined.includes(c.slug));
  return (
    <section className="dh-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-fg">Centres d’intérêt</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Choisir mes centres d’intérêt"
          className="grid size-7 place-items-center rounded-[8px] text-subtle hover:bg-surface-2 hover:text-fg"
        >
          <Settings2 className="size-4" />
        </button>
      </div>
      {picked.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-left text-[13px] leading-snug text-muted hover:text-fg"
        >
          Choisis tes sujets : ton fil ne montrera qu’eux.
        </button>
      ) : (
        <ul className="mt-2 flex flex-col gap-0.5">
          {picked.map((c) => (
            <li key={c.slug}>
              <Link
                to={topic === c.slug ? '/' : `/?topic=${c.slug}`}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-[8px] px-2 text-[14px] transition-colors',
                  topic === c.slug ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2',
                )}
              >
                <CommunityIcon slug={c.slug} size={22} />
                <span className="truncate">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <InterestsSheet open={open} onOpenChange={setOpen} />
    </section>
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
                on ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong',
              )}
            >
              <CommunityIcon slug={c.slug} size={28} />
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
    'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[8px] px-2 text-[14px] font-medium whitespace-nowrap text-muted transition-colors hover:bg-surface-2 hover:text-fg';
  return (
    <section data-tour="hero" className="dh-panel px-4 pt-4 pb-2">
      <div className="flex items-center gap-3">
        <Avatar name={me.displayName} src={me.avatarUrl} size={48} />
        <button
          type="button"
          onClick={() => nav('/publier')}
          className="h-12 min-w-0 flex-1 truncate rounded-full border border-line-strong px-5 text-left text-[15px] font-medium text-subtle transition-colors hover:bg-surface-2"
        >
          Partage une avancée, un projet, une question
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <button type="button" data-tour="hero-ask" onClick={() => setAsk(true)} className={action}>
          <Zap className="size-5 text-warning" />
          Je suis bloqué
        </button>
        <button type="button" onClick={() => nav('/publier?type=launch')} className={action}>
          <FolderGit2 className="size-5 text-accent-text" />
          Un projet
        </button>
        <button type="button" onClick={() => nav('/banc')} className={action}>
          <Smartphone className="size-5 text-teal" />
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
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') ?? '';
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
    return [
      ...news.map((item) => ({ kind: 'news' as const, at: item.publishedAt, item })),
      ...mine.map((post) => ({ kind: 'post' as const, at: post.createdAt, post })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home.data, posts.data, more, topic, joined]);

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

  const chips = COMMUNITIES.filter((c) => joined.includes(c.slug) || c.slug === topic);

  return (
    <div className="flex flex-col gap-3 pt-4">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        <Chip active={!topic} onClick={() => setParams({}, { replace: true })}>
          {joined.length ? 'Mes sujets' : 'Tout'}
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
      </div>
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
        'h-9 shrink-0 rounded-full border px-4 text-[14px] transition-colors',
        active
          ? 'border-fg bg-fg text-canvas'
          : 'border-line-strong bg-surface-1 text-muted hover:border-fg hover:text-fg',
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
          <Bookmark className={cn('size-5', saved && 'fill-current')} />
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
            className="aspect-[1.91/1] w-full object-cover"
          />
          {video && (
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-16 place-items-center rounded-full bg-black/70 text-white">
                <Play className="ml-1 size-7 fill-current" />
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
        {video ? <Play className="size-4" /> : <ExternalLink className="size-4" />}
        <span className="truncate">{video ? 'youtube.com' : domainOf(item.url)}</span>
      </a>
      <footer className="flex items-center gap-1 px-2 py-1">
        <button type="button" onClick={discuss} className={action}>
          <MessageSquare className="size-5" />
          Discuter
        </button>
        <button type="button" onClick={share} className={action}>
          <Share2 className="size-5" />
          Partager
        </button>
        <a href={href} target="_blank" rel="noopener noreferrer" className={action}>
          {video ? <Play className="size-5" /> : <ExternalLink className="size-5" />}
          {video ? 'Regarder' : 'Lire'}
        </a>
      </footer>
    </article>
  );
}

/* ---------------- Colonne de droite ---------------- */

/** « À la une », à la manière des actualités de LinkedIn : les titres du moment, sources réelles. */
function Headlines() {
  const lang = useLang();
  const { data } = useQuery<HomeNews>('news:home:all', () => fetchHome('all'));
  const [all, setAll] = useState(false);
  const items = data
    ? [...data.hero, ...(data.sections.afrique ?? []), ...(data.sections.ia ?? [])]
    : [];
  const seen = new Set<string>();
  const list = items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  const talks = data?.hn.filter((h) => h.comments > 0).slice(0, 3) ?? [];
  return (
    <section className="dh-panel p-4">
      <h2 className="text-[17px] font-semibold text-fg">À la une</h2>
      <p className="text-[13px] text-subtle">Choisi parmi {data?.sources ?? '…'} sources tech</p>
      {!data ? (
        <div className="mt-3 flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 rounded-[8px]" />
          ))}
        </div>
      ) : (
        <ul className="mt-2 flex flex-col">
          {list.slice(0, all ? 10 : 5).map((a) => (
            <li key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group -mx-2 flex gap-2 rounded-[8px] px-2 py-2 hover:bg-surface-2"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-fg/70" aria-hidden />
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[14px] leading-snug font-medium text-fg">
                    {a.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-subtle">
                    {relativeTime(a.publishedAt, lang)} · {a.sourceName}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {list.length > 5 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-1 -ml-2 h-9 rounded-[8px] px-2 text-[14px] font-medium text-muted hover:bg-surface-2 hover:text-fg"
        >
          {all ? 'Afficher moins' : 'Afficher plus'}
        </button>
      )}
      {talks.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <h3 className="text-[14px] font-semibold text-fg">Ça discute chez les devs</h3>
          <ul className="mt-1 flex flex-col">
            {talks.map((h) => (
              <li key={h.id}>
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-mx-2 block rounded-[8px] px-2 py-2 hover:bg-surface-2"
                >
                  <span className="line-clamp-2 text-[14px] leading-snug text-fg">{h.title}</span>
                  <span className="mt-0.5 block text-[12.5px] text-subtle">
                    {h.comments} commentaires · Hacker News
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DevsToMeet() {
  const { t } = useTranslation();
  const { data } = useQuery('home', () => api.getHome());
  const devs = data?.devsToMeet.slice(0, 3) ?? [];
  if (!devs.length) return null;
  return (
    <section className="dh-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold text-fg">Devs à rencontrer</h2>
        <Link to="/decouvrir" className="text-[12.5px] text-subtle hover:text-fg">
          Tout voir
        </Link>
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {devs.map(({ dev, reason }) => (
          <li key={dev.id} className="flex items-center gap-2.5">
            <Avatar name={dev.displayName} src={dev.avatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <Link
                to={`/u/${dev.handle}`}
                className="block truncate text-[14px] font-medium text-fg hover:underline"
              >
                {dev.displayName}
              </Link>
              <p className="truncate text-[12px] text-subtle">{t(reason.key, reason.params)}</p>
            </div>
            <Link
              to={`/u/${dev.handle}`}
              className="lg-clear inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[12.5px]"
            >
              Voir
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function JobsPanel() {
  const { data: jobs } = useQuery('jobs', fetchJobs);
  const { data: liveJobs } = useQuery<NewsItem[]>(
    jobs?.length === 0 ? 'rail:live-jobs' : null,
    () => fetchNews({ kind: 'job', limit: 3 }),
  );
  const list = (jobs ?? []).slice(0, 3);
  const live = jobs?.length === 0 ? (liveJobs ?? []).slice(0, 3) : [];
  if (!list.length && !live.length) return null;
  return (
    <section className="dh-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-fg">
          <Briefcase className="size-5 text-subtle" />
          Emplois
        </h2>
        <Link to="/emplois" className="text-[12.5px] text-subtle hover:text-fg">
          Tout voir
        </Link>
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {list.map((j) => (
          <li key={j.id}>
            <Link to={`/emplois/${j.id}`} className="group block">
              <span className="block text-[14px] leading-snug font-medium text-fg group-hover:underline">
                {j.title}
              </span>
              <span className="mt-0.5 block text-[12px] text-subtle">
                {j.company} · {j.location}
              </span>
            </Link>
          </li>
        ))}
        {live.map((j) => (
          <li key={j.id}>
            <a href={j.url} target="_blank" rel="noopener noreferrer" className="group block">
              <span className="block text-[14px] leading-snug font-medium text-fg group-hover:underline">
                {j.title}
              </span>
              <span className="mt-0.5 block text-[12px] text-subtle">
                {[j.author, j.sourceName].filter(Boolean).join(' · ')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
