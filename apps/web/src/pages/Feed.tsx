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
import { api, type ActivityItem, type QuestionTab } from '@/services';
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
    <div className="dh-page mx-auto grid w-full max-w-[1240px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[232px_minmax(0,1fr)_300px]">
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
                '-mb-px h-10 border-b-2 px-3 text-[14px] transition-colors',
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
          <LivePanel />
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
      <div className="h-14 bg-[linear-gradient(135deg,#0f1117,#1e2a4a)]" aria-hidden />
      <div className="px-4 pb-4">
        <Link
          to={`/u/${me.handle}`}
          className="-mt-7 block w-fit rounded-full ring-4 ring-surface-1"
        >
          <Avatar name={me.displayName} src={me.avatarUrl} size={56} />
        </Link>
        <Link
          to={`/u/${me.handle}`}
          className="mt-2 block text-[15px] font-medium text-fg hover:underline"
        >
          {me.displayName}
        </Link>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">
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
            <dt className="text-[11.5px] text-subtle">{label}</dt>
            <dd className="mt-0.5 font-mono text-[14px] text-fg tabular">{v ?? '–'}</dd>
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
        <h2 className="text-[13px] font-medium text-fg">Centres d’intérêt</h2>
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
                  'flex h-8 items-center gap-2 rounded-[8px] px-2 text-[13px] transition-colors',
                  topic === c.slug ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2',
                )}
              >
                <CommunityIcon slug={c.slug} size={18} />
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
    'inline-flex h-9 items-center gap-2 rounded-[8px] px-2.5 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg';
  return (
    <section data-tour="hero" className="dh-panel p-3">
      <div className="flex items-center gap-3">
        <Avatar name={me.displayName} src={me.avatarUrl} size={40} />
        <button
          type="button"
          onClick={() => nav('/publier')}
          className="h-11 min-w-0 flex-1 truncate rounded-full border border-line-strong px-4 text-left text-[14px] text-subtle transition-colors hover:bg-surface-2"
        >
          Partage une avancée, un projet, une question
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 pl-[52px]">
        <button type="button" data-tour="hero-ask" onClick={() => setAsk(true)} className={action}>
          <Zap className="size-4 text-warning" />
          Je suis bloqué
        </button>
        <button type="button" onClick={() => nav('/publier?type=launch')} className={action}>
          <FolderGit2 className="size-4 text-accent-text" />
          Montrer un projet
        </button>
        <button type="button" onClick={() => nav('/banc')} className={action}>
          <Smartphone className="size-4 text-success" />
          Faire tester mon app
        </button>
      </div>
    </section>
  );
}

/* ---------------- Pour toi : publications filtrées + questions qui m'attendent ---------------- */

function ForYou() {
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') ?? '';
  const joined = usePlatform((s) => s.joined);
  const [sort, setSort] = useState<'recent' | 'top'>('recent');
  const { data, error } = useQuery(`posts:feed:${sort}:${topic}`, () =>
    communityApi.list({ sort, community: topic || undefined }),
  );
  const posts = (data?.data ?? []).filter(
    (p) => topic || joined.length === 0 || joined.includes(p.community),
  );
  const chips = COMMUNITIES.filter((c) => joined.includes(c.slug) || c.slug === topic);

  return (
    <div className="flex flex-col gap-3 pt-4">
      <NeedsYou />
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
        <Chip active={!topic} onClick={() => setParams({}, { replace: true })}>
          {joined.length ? 'Mes sujets' : 'Tout'}
        </Chip>
        {chips.map((c) => (
          <Chip
            key={c.slug}
            active={topic === c.slug}
            onClick={() => setParams({ topic: c.slug }, { replace: true })}
          >
            #{c.slug}
          </Chip>
        ))}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[12.5px]">
          {(
            [
              ['recent', 'Récentes'],
              ['top', 'Populaires'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
              className={cn(
                'h-7 rounded-[6px] px-2',
                sort === k ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg',
              )}
            >
              {l}
            </button>
          ))}
        </span>
      </div>
      {!data && !error && <PostSkeletons />}
      {!!error && !data && (
        <p className="dh-panel p-6 text-center text-muted">
          Impossible de charger les publications. Réessaie dans un instant.
        </p>
      )}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {data && posts.length === 0 && (
        <div className="dh-panel p-8 text-center">
          <p className="font-medium text-fg">Rien de neuf sur tes sujets pour l’instant</p>
          <p className="mx-auto mt-1 max-w-[420px] text-[14px] text-muted">
            Montre ce que tu construis ou pose la question qui te bloque : la première publication
            lance la conversation.
          </p>
          <Link
            to="/publier"
            className="lg-tint mt-4 inline-flex h-10 items-center rounded-[10px] px-4 text-[14px] font-medium"
          >
            Publier
          </Link>
        </div>
      )}
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
        'h-8 shrink-0 rounded-full border px-3 text-[13px] transition-colors',
        active
          ? 'border-fg bg-fg text-canvas'
          : 'border-line-strong text-muted hover:border-fg hover:text-fg',
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
    <section aria-labelledby="needs-you" className="dh-panel p-3">
      <div className="flex items-center justify-between px-1">
        <h2 id="needs-you" className="flex items-center gap-2 text-[13px] font-medium text-fg">
          <span className="dh-live" aria-hidden />
          {home?.openInMyStacks.length ? 'Ils ont besoin de toi' : 'Personne n’a encore répondu'}
        </h2>
        <Link
          to="/?f=questions"
          className="text-[12.5px] text-subtle transition-colors hover:text-fg"
        >
          Toutes les questions
        </Link>
      </div>
      <div className="mt-2 flex flex-col gap-2">
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
    'inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] text-subtle transition-colors hover:bg-surface-2 hover:text-fg';

  return (
    <article className="dh-panel overflow-hidden">
      <header className="flex items-center gap-2.5 px-4 pt-3.5 text-[13px]">
        <SourceMark item={item} size={22} />
        <span className="font-medium text-fg">{item.sourceName}</span>
        <span className="text-subtle">
          · <Ago iso={item.publishedAt} />
        </span>
        {tag && tag !== 'Tout' && (
          <span className="dh-mono ml-auto text-subtle">#{tag.toLowerCase()}</span>
        )}
      </header>
      <a href={href} target="_blank" rel="noopener noreferrer" className="group block px-4 pt-2">
        <h2 className="text-[17px] leading-[1.35] font-medium text-fg group-hover:text-accent-text">
          {item.title}
        </h2>
        {item.summary && (
          <p className="mt-1.5 line-clamp-3 text-[14px] leading-[1.55] text-muted">
            {item.summary}
          </p>
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
              <span className="grid size-12 place-items-center rounded-full bg-black/70 text-white">
                <Play className="ml-0.5 size-5 fill-current" />
              </span>
            </span>
          )}
        </a>
      )}
      <footer className="flex items-center gap-1 border-t border-line px-2 py-1">
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
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(action, 'ml-auto hidden sm:inline-flex')}
        >
          {video ? <Play className="size-4" /> : <ExternalLink className="size-4" />}
          <span className="dh-mono">{video ? 'Regarder' : domainOf(item.url)}</span>
        </a>
      </footer>
    </article>
  );
}

/* ---------------- Colonne de droite ---------------- */

const ACTIVITY_VERB: Record<ActivityItem['kind'], string> = {
  resolved: 'a été débloqué sur',
  answered: 'a répondu à',
  joined: 'a rejoint',
  'task-done': 'a livré',
  'room-created': 'a ouvert le projet',
  asked: 'demande de l’aide sur',
};

/** Ce qui se passe maintenant sur le réseau : relu toutes les 30 secondes. */
function LivePanel() {
  const lang = useLang();
  const { data, refresh } = useQuery('home', () => api.getHome());
  useEffect(() => {
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);
  const items = data?.activity.slice(0, 6) ?? [];
  return (
    <section className="dh-panel p-4">
      <h2 className="flex items-center gap-2 text-[13px] font-medium text-fg">
        <span className="dh-live" aria-hidden />
        En direct
      </h2>
      {!data ? (
        <div className="mt-3 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 rounded-[8px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">Le réseau est calme pour l’instant.</p>
      ) : (
        <ol className="dh-stagger mt-3 flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id} className="flex gap-2.5">
              <Link to={`/u/${a.actor.handle}`} className="shrink-0">
                <Avatar name={a.actor.displayName} src={a.actor.avatarUrl} size={28} />
              </Link>
              <p className="min-w-0 text-[12.5px] leading-snug text-muted">
                <Link to={`/u/${a.actor.handle}`} className="font-medium text-fg hover:underline">
                  {a.actor.displayName.split(' ')[0]}
                </Link>{' '}
                {ACTIVITY_VERB[a.kind]}{' '}
                <Link to={a.targetHref} className="text-fg hover:underline">
                  {a.targetLabel}
                </Link>
                <span className="block font-mono text-[11px] text-subtle">
                  {relativeTime(a.createdAt, lang)}
                </span>
              </p>
            </li>
          ))}
        </ol>
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
        <h2 className="text-[13px] font-medium text-fg">Devs à rencontrer</h2>
        <Link to="/decouvrir" className="text-[12.5px] text-subtle hover:text-fg">
          Tout voir
        </Link>
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {devs.map(({ dev, reason }) => (
          <li key={dev.id} className="flex items-center gap-2.5">
            <Avatar name={dev.displayName} src={dev.avatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <Link
                to={`/u/${dev.handle}`}
                className="block truncate text-[13px] font-medium text-fg hover:underline"
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
        <h2 className="flex items-center gap-2 text-[13px] font-medium text-fg">
          <Briefcase className="size-4 text-subtle" />
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
              <span className="block text-[13px] leading-snug font-medium text-fg group-hover:underline">
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
              <span className="block text-[13px] leading-snug font-medium text-fg group-hover:underline">
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
