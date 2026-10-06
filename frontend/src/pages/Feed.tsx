import { PenSquare, Hash, Award, Briefcase, Flame, GraduationCap, Image as ImageIcon, Link2, PlaySquare, Puzzle, Sparkles, TrendingUp, Wand2, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Avatar, Skeleton } from '@/components/ui/primitives'
import { fetchHome, fetchNews, NEWS_CATEGORIES, type HomeNews, type Lang, type NewsItem } from '@/platform/news'
import { ArticleCard, DevtoCard, HeroNews, HnRow, ReleaseCard, RepoRow, SectionHead, VideoTile } from '@/platform/newsui'
import { BrandLogo } from '@/platform/logos'
import { COMMUNITIES, POSTS } from '@/platform/data/feed'
import { JOBS } from '@/platform/data/jobs'
import { VIDEOS } from '@/platform/data/videos'
import { usePlatform } from '@/platform/store'
import type { Post } from '@/platform/types'
import { Ago, CUBE, Chips, CommunityIcon, CompanyLogo, PostCard, ServiceHeader, SideCard, StatCard, VideoThumb, companyOf, compact } from '@/platform/ui'
import { Button } from '@/components/ui/button'
import { PLATFORM_CERTS } from '@/platform/data/certs'
import { useQuery } from '@/lib/query'
import { api } from '@/services'
import { person } from '@/platform/data/people'
import { cn } from '@/lib/utils'
import { useSession, useUI } from '@/stores/app'

const TRENDS = [
  { tag: 'MCP et agents de code', count: 214, logo: 'MCP', to: '/c/ia' },
  { tag: 'Mobile money', count: 168, logo: '', to: '/c/fintech' },
  { tag: 'Flutter hors ligne', count: 121, logo: 'Flutter', to: '/c/mobile' },
  { tag: 'Premier emploi', count: 97, logo: '', to: '/c/carriere' },
  { tag: 'Claude Code', count: 88, logo: 'Claude', to: '/skills?outil=claude' },
]

const EVENTS = [
  { day: 'Live', time: '●', live: true, kind: 'Live · Jean-Eudes Hounkpatin', title: 'On code la synchro hors ligne d’une app Flutter', to: '/videos/v-live-flutter' },
  { day: 'Jeu.', time: '19:00', kind: 'Atelier · UTC', title: 'Écrire et sécuriser son premier serveur MCP', to: '/videos/v-mcp' },
  { day: 'Sam.', time: '15:00', kind: 'Questions-réponses · UTC', title: 'Recruter et être recruté en remote depuis l’Afrique', to: '/c/carriere' },
]

type FeedTab = 'pour-toi' | 'actu' | 'projets' | 'opensource' | 'discussions' | 'emplois'

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'pour-toi', label: 'Pour toi' },
  { id: 'actu', label: 'Actu IA & Tech' },
  { id: 'projets', label: 'Projets' },
  { id: 'opensource', label: 'Open source' },
  { id: 'discussions', label: 'Discussions' },
  { id: 'emplois', label: 'Emplois' },
]

const MATCH: Record<FeedTab, (p: Post) => boolean> = {
  'pour-toi': () => true,
  actu: (p) => p.kind === 'news',
  projets: (p) => p.kind === 'launch' || p.kind === 'showcase',
  opensource: (p) => p.kind === 'opensource',
  discussions: (p) => p.kind === 'discussion' || p.kind === 'question',
  emplois: (p) => p.kind === 'job',
}

/** Raccourcis vers les services de l'écosystème (colonne de droite et bandeau mobile). */
const SERVICES = [
  { to: '/emplois', icon: Briefcase, label: 'Emplois', color: '#22a3ee', stat: `${JOBS.length} offres` },
  { to: '/certifications', icon: Award, label: 'Certifications', color: '#f0b232', stat: 'Gratuites et payantes' },
  { to: '/skills', icon: Puzzle, label: 'Skills IA', color: '#8b7cf8', stat: 'Claude, Codex, Antigravity' },
  { to: '/videos', icon: PlaySquare, label: 'Vidéos', color: '#e5333b', stat: '1 live en cours' },
  { to: '/apprendre', icon: GraduationCap, label: 'Apprendre', color: '#3ccf8e', stat: '6 parcours' },
  { to: '/creer', icon: Wand2, label: 'Créer avec l’IA', color: '#6a5ae6', stat: 'Guide en 11 étapes' },
]

export default function Feed() {
  const me = useSession((s) => s.user)
  const setAsk = useUI((s) => s.setAsk)
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('f') as FeedTab) || 'pour-toi'
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const myPosts = usePlatform((s) => s.myPosts)
  const joined = usePlatform((s) => s.joined)
  const toggle = usePlatform((s) => s.toggle)

  const posts = useMemo(() => {
    const all = [...myPosts, ...POSTS].filter(MATCH[tab])
    return sort === 'new' ? all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : all.sort((a, b) => hot(b) - hot(a))
  }, [myPosts, tab, sort])

  return (
    <div className="dh-page mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <ServiceHeader
        title="Accueil"
        subtitle="L’actu IA, tech et dev en continu, les vidéos du moment, les projets et les questions de la communauté."
        actions={
          me && (
            <>
              <Button variant="secondary" size="sm" icon={<PenSquare />} onClick={() => nav('/publier')}>
                Publier
              </Button>
              <Button variant="primary" size="sm" icon={<Zap />} onClick={() => setAsk(true)} data-tour="hero-ask">
                Je suis bloqué
              </Button>
            </>
          )
        }
      />
      <NewsTop />
      {me && <FeedStats />}
      <NewsBody />
      <SectionHead title="Communauté DevHub" />
      <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        {/* Services de l'écosystème, en bandeau sur petits écrans */}
        <div className="no-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 lg:hidden">
          {SERVICES.map((s) => (
            <Link key={s.to} to={s.to} className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-line bg-surface-1 px-3.5 text-[13px] font-medium text-fg">
              <s.icon className="size-4 text-muted" />
              {s.label}
            </Link>
          ))}
        </div>

        {/* Composer */}
        {me && (
          <div data-tour="hero" className="flex items-center gap-3 rounded-[20px] bg-surface-1 p-3">
            <Avatar name={me.displayName} src={me.avatarUrl} size={38} />
            <button type="button" onClick={() => nav('/publier')} className="h-11 min-w-0 flex-1 truncate rounded-full bg-canvas px-4 text-left text-[14px] text-subtle shadow-sm">
              Partage un projet, une actu, une question…
            </button>
            <button type="button" onClick={() => nav('/publier?type=launch')} aria-label="Publier un projet avec image" className="hidden size-10 place-items-center rounded-[8px] text-muted hover:bg-surface-2 hover:text-fg sm:grid">
              <ImageIcon className="size-5" />
            </button>
            <button type="button" onClick={() => nav('/publier?type=news')} aria-label="Partager un lien" className="hidden size-10 place-items-center rounded-[8px] text-muted hover:bg-surface-2 hover:text-fg sm:grid">
              <Link2 className="size-5" />
            </button>

          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <h2 className="shrink-0 text-[17px] font-bold tracking-[-0.02em] text-fg">Posts</h2>
          <Chips items={TABS} value={tab} onChange={(v) => setParams(v === 'pour-toi' ? {} : { f: v }, { replace: true })} className="min-w-0 flex-1" />
          <div className="hidden shrink-0 items-center gap-1 rounded-[8px] bg-surface-1 p-0.5 sm:flex" role="group" aria-label="Tri">
            {(
              [
                ['top', 'Populaires', Flame],
                ['new', 'Récents', TrendingUp],
              ] as const
            ).map(([id, label, Icon]) => (
              <button key={id} type="button" aria-pressed={sort === id} onClick={() => setSort(id)} className={cn('inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-semibold', sort === id ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg')}>
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="dh-stagger mt-3 flex flex-col gap-2.5">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </div>

      {/* Colonne de droite : l'écosystème */}
      <aside className="hidden w-[316px] shrink-0 flex-col gap-4 lg:flex">
        <SideCard title="Les services DevHub">
          <div className="grid grid-cols-2 gap-2">
            {SERVICES.map((s) => (
              <Link key={s.to} to={s.to} className="group flex flex-col gap-2.5 rounded-[14px] bg-canvas p-3 transition-colors ">
                <s.icon className="size-[18px] text-muted group-hover:text-fg" />
                <span>
                  <span className="block text-[13px] leading-tight font-semibold text-fg">{s.label}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-tight text-subtle">{s.stat}</span>
                </span>
              </Link>
            ))}
          </div>
        </SideCard>

        <SideCard title="Tendances de la semaine">
          <ol className="-mx-1 flex flex-col">
            {TRENDS.map((t, i) => (
              <li key={t.tag}>
                <Link to={t.to} className="flex items-center gap-3 rounded-[6px] px-1 py-1.5 hover:bg-surface-2">
                  <span className="w-4 text-right text-[12px] text-subtle tabular">{i + 1}</span>
                  <span className="grid size-7 place-items-center rounded-[6px] bg-canvas">
                    {t.logo ? <BrandLogo name={t.logo} size={14} /> : <Hash className="size-3.5 text-muted" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-fg">{t.tag}</span>
                    <span className="block text-[11.5px] text-subtle">{t.count} publications</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </SideCard>

        <SideCard title="À venir">
          <ul className="flex flex-col gap-3">
            {EVENTS.map((e) => (
              <li key={e.title}>
                <Link to={e.to} className="group flex gap-3">
                  <span className={cn('flex w-11 shrink-0 flex-col items-center rounded-[6px] border py-1 text-center', e.live ? 'border-danger/50 text-danger' : 'border-line text-muted')}>
                    <span className="text-[10px] font-semibold uppercase">{e.day}</span>
                    <span className="text-[13px] font-semibold text-fg tabular">{e.time}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-medium text-subtle">{e.kind}</span>
                    <span className="line-clamp-2 text-[13px] leading-snug font-medium text-fg group-hover:underline">{e.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SideCard>

        <SideCard title="Offres pour toi" action={<Link to="/emplois" className="text-[12.5px] font-semibold text-accent-text hover:underline">Tout voir</Link>}>
          <ul className="-mx-2 flex flex-col">
            {JOBS.slice(0, 3).map((j) => (
              <li key={j.id}>
                <Link to={`/emplois/${j.id}`} className="flex gap-3 rounded-[8px] px-2 py-2 hover:bg-surface-2">
                  <CompanyLogo slug={j.company} size={36} />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-fg">{j.title}</span>
                    <span className="block truncate text-[12px] text-subtle">
                      {companyOf(j.company).name} · {j.city}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SideCard>

        <SideCard title="Communautés populaires" action={<Link to="/communautes" className="text-[12.5px] font-semibold text-accent-text hover:underline">Explorer</Link>}>
          <ul className="flex flex-col gap-2.5">
            {[...COMMUNITIES]
              .sort((a, b) => b.members - a.members)
              .slice(0, 5)
              .map((c) => {
                const isIn = joined.includes(c.slug)
                return (
                  <li key={c.slug} className="flex items-center gap-2.5">
                    <CommunityIcon slug={c.slug} size={32} />
                    <Link to={`/c/${c.slug}`} className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-fg hover:underline">c/{c.slug}</span>
                      <span className="block text-[12px] text-subtle">{compact(c.members)} membres</span>
                    </Link>
                    <button type="button" onClick={() => toggle('joined', c.slug)} className={cn('h-7 rounded-full px-3 text-[12.5px] font-semibold', isIn ? 'border border-line-strong text-muted' : 'bg-fg text-canvas')}>
                      {isIn ? 'Membre' : 'Rejoindre'}
                    </button>
                  </li>
                )
              })}
          </ul>
        </SideCard>

        <SideCard title="Vidéos du moment" action={<Link to="/videos" className="text-[12.5px] font-semibold text-accent-text hover:underline">Tout voir</Link>}>
          <div className="flex flex-col gap-3">
            {VIDEOS.slice(1, 3).map((v) => (
              <Link key={v.id} to={`/videos/${v.id}`} className="group flex gap-3">
                <VideoThumb video={v} className="w-[120px] shrink-0 rounded-[8px]" />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-fg group-hover:underline">{v.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-subtle">{person(v.channel).name}</span>
                </span>
              </Link>
            ))}
          </div>
        </SideCard>

        <p className="px-1 text-[12px] leading-relaxed text-subtle">
          <Sparkles className="mr-1 inline size-3.5" />
          Les publications marquées « démo » sont des exemples, en attendant les vrais contenus de la communauté.
        </p>
      </aside>
      </div>
    </div>
  )
}

/** Indicateurs personnels, façon cartes « Drivery » : calculés sur les vraies données du compte. */
function FeedStats() {
  const me = useSession((s) => s.user)!
  const { data: passport } = useQuery(`passport:${me.handle}`, () => api.getPassport(me.handle))
  const { data: home } = useQuery('home', () => api.getHome())
  const applications = usePlatform((s) => s.applications)
  const certResults = usePlatform((s) => s.certResults)
  const week = Date.now() - 7 * 864e5
  const xpWeek = passport?.proofs.filter((e) => e.kind !== 'revert' && new Date(e.createdAt).getTime() > week).reduce((n, e) => n + e.points, 0) ?? 0
  // Entraide par semaine (10 dernières semaines), à partir du calendrier du profil
  const weeks = passport ? Array.from({ length: 10 }, (_, i) => passport.heatmap.slice(-70).slice(i * 7, i * 7 + 7).reduce((n, d) => n + d.count, 0)) : []
  let acc = 0
  const spark = weeks.map((w) => (acc += w + 1))
  const badges = PLATFORM_CERTS.filter((c) => certResults[c.id]?.passed).length
  return (
    <div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
      <StatCard dark label="proof xp" value={passport ? passport.totalXp : '—'} spark={spark.length ? spark : [1, 2, 2, 3, 3, 4, 5, 5, 6, 7]} delta={`+${xpWeek}`} note="cette semaine" to={`/u/${me.handle}`} />
      <StatCard label="questions dans tes stacks" value={home?.openInMyStacks.length ?? '—'} cube={CUBE.orange} delta={`${home?.unanswered.length ?? 0}`} note="sans réponse sur la plateforme" to="/sos" />
      <StatCard label="candidatures" value={applications.length} cube={CUBE.purple} delta={`${JOBS.length}`} note="offres ouvertes en ce moment" to="/emplois" />
      <StatCard label="badges obtenus" value={badges} cube={CUBE.green} delta={`${PLATFORM_CERTS.length - badges}`} note="certifications gratuites à passer" to="/certifications" />
    </div>
  )
}

/** Classement « populaire » : score pondéré par l'âge (comme Reddit). */
function hot(p: Post) {
  const hours = (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000
  return (p.score + p.comments * 2) / Math.pow(hours + 2, 1.2)
}

/* ================================================================
   Actualités réelles (backend /api/news) : à la une, rubriques, vidéos,
   Hacker News, dépôts, versions, DEV Community.
   ================================================================ */

function useHome(lang: Lang) {
  return useQuery<HomeNews>(`news:home:${lang}`, () => fetchHome(lang))
}

function NewsStatus({ data, error }: { data?: HomeNews; error: unknown }) {
  if (error && !data)
    return (
      <p className="mt-6 rounded-[20px] bg-surface-1 p-5 text-[14px] text-muted">
        Les actualités ne sont pas disponibles pour le moment (serveur injoignable). Le reste de la plateforme fonctionne normalement.
      </p>
    )
  if (!data) return null
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
      <span className={cn('size-2 rounded-full', data.offline ? 'bg-warning' : 'bg-success')} />
      {data.offline ? 'Hors ligne : dernières actualités enregistrées sur ton appareil' : `${data.sources} sources suivies en continu`}
      {data.updatedAt && (
        <>
          <span aria-hidden>·</span>
          mis à jour <Ago iso={data.updatedAt} />
        </>
      )}
      <Link to="/sources" className="font-medium text-fg underline-offset-2 hover:underline">
        Voir les sources
      </Link>
    </p>
  )
}

function NewsTop() {
  const { data, error } = useHome('all')
  return (
    <section className="mt-7">
      {!data && !error ? <Skeleton className="h-[380px] rounded-[24px]" /> : data && <HeroNews items={data.hero} />}
      <NewsStatus data={data} error={error} />
    </section>
  )
}

function NewsBody() {
  const [cat, setCat] = useState('all')
  const [lang, setLang] = useState<Lang>('all')
  const { data } = useHome(lang)
  const [more, setMore] = useState<NewsItem[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const { data: catItems } = useQuery<NewsItem[]>(cat === 'all' ? null : `news:cat:${cat}:${lang}`, () => fetchNews({ category: cat, kind: 'article', lang, limit: 24 }))
  if (!data) return null

  // « Tout » : les rubriques mélangées par date, une même histoire une seule fois
  const heroIds = new Set(data.hero.map((h) => h.id))
  const all = Object.values(data.sections)
    .flat()
    .filter((i) => !heroIds.has(i.id))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const list = [...(cat === 'all' ? all.slice(0, 18) : (catItems ?? data.sections[cat] ?? [])), ...more]

  const loadMore = async () => {
    const last = list[list.length - 1]
    if (!last) return
    setLoadingMore(true)
    try {
      const items = await fetchNews({ category: cat === 'all' ? undefined : cat, kind: 'article', lang, before: last.publishedAt, limit: 18 })
      setMore((m) => [...m, ...items])
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <>
      <section className="mt-10">
        <SectionHead title="Actualités">
          <Chips
            items={NEWS_CATEGORIES}
            value={cat}
            onChange={(v) => {
              setCat(v)
              setMore([])
            }}
            className="min-w-0 flex-1"
          />
          <div className="flex shrink-0 gap-1 rounded-full bg-surface-1 p-1" role="group" aria-label="Langue">
            {(['all', 'fr', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => {
                  setLang(l)
                  setMore([])
                }}
                className={cn('h-7 rounded-full px-3 text-[12.5px] font-medium', lang === l ? 'bg-fg text-canvas' : 'text-muted hover:text-fg')}
              >
                {l === 'all' ? 'Toutes' : l.toUpperCase()}
              </button>
            ))}
          </div>
        </SectionHead>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((it) => (
            <ArticleCard key={it.id} item={it} />
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
            Plus d’actualités
          </Button>
        </div>
      </section>

      {data.videos.length > 0 && (
        <section className="mt-12">
          <SectionHead title="Vidéos du moment" action={{ label: 'Toutes les vidéos', to: '/videos' }} />
          <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.videos.slice(0, 8).map((v) => (
              <VideoTile key={v.id} item={v} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 grid gap-8 xl:grid-cols-2">
        {data.hn.length > 0 && (
          <section>
            <SectionHead title="En tête de Hacker News" />
            <ol className="flex flex-col gap-2">
              {data.hn.slice(0, 10).map((it, i) => (
                <HnRow key={it.id} item={it} rank={i + 1} />
              ))}
            </ol>
          </section>
        )}
        {data.repos.length > 0 && (
          <section>
            <SectionHead title="Dépôts GitHub de la semaine" />
            <ul className="flex flex-col gap-2">
              {data.repos.slice(0, 10).map((it) => (
                <RepoRow key={it.id} item={it} />
              ))}
            </ul>
          </section>
        )}
      </div>

      {data.releases.length > 0 && (
        <section className="mt-12">
          <SectionHead title="Nouvelles versions" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.releases.slice(0, 12).map((it) => (
              <ReleaseCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}

      {data.devto.length > 0 && (
        <section className="mt-12">
          <SectionHead title="À lire sur DEV Community" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.devto.slice(0, 8).map((it) => (
              <DevtoCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}
      <div className="mt-12" />
    </>
  )
}
