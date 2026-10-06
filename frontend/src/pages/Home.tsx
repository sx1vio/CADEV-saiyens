import { ArrowRight, Award, ChevronRight, Clock3, FolderGit2, Inbox, Radio, Sparkles, Users, Zap } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import heroHub from '@/assets/hero-hub.webp'
import heroHubSm from '@/assets/hero-hub-sm.webp'
import { Djeli, EmptyState, ErrorState } from '@/components/djeli'
import { ActivityFeed, DevCard, QuestionCard, RoomCard } from '@/components/domain'
import { Button, ButtonLink } from '@/components/ui/button'
import { Avatar, Card, CardHeader, IconChip, Skeleton } from '@/components/ui/primitives'
import { MembersPanel } from '@/components/presence'
import { Segmented } from '@/components/ui/segmented'
import { formatNumber, useLang } from '@/i18n'
import { countryName } from '@/lib/geo'
import { useQuery } from '@/lib/query'
import { cn, storageGet } from '@/lib/utils'
import { api, type HomeFeed } from '@/services'
import { useSession, useUI } from '@/stores/app'
import { ListSkeleton } from './_skeleton'

function greetingKey() {
  const h = new Date().getHours()
  return h < 12 ? 'greeting.morning' : h < 18 ? 'greeting.afternoon' : 'greeting.evening'
}

/** Le QG : répond à « qu'est-ce que je fais maintenant ? ». */
export default function Home() {
  const { t } = useTranslation()
  const lang = useLang()
  const me = useSession((s) => s.user)!
  const setAsk = useUI((s) => s.setAsk)
  const { data, error, refresh } = useQuery<HomeFeed>('home', () => api.getHome())
  const { data: passport } = useQuery(`passport:${me.handle}`, () => api.getPassport(me.handle))
  const { data: devs } = useQuery('devs:presence', () => api.discoverDevs({}))
  const startTour = useUI((s) => s.startTour)
  const tourStep = useUI((s) => s.tourStep)

  // Première visite du QG : Djeli fait la visite (une seule fois, relançable depuis le menu).
  useEffect(() => {
    if (storageGet('dh-tour-done') || tourStep !== null) return
    const id = setTimeout(startTour, 700)
    return () => clearTimeout(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [qTab, setQTab] = useState<'for-you' | 'unanswered'>(me.intent === 'help' ? 'unanswered' : 'for-you')

  const firstName = me.displayName.split(' ')[0]

  const questionsBlock = (
    <Card className="p-4 sm:p-5" key="questions">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardHeader icon={<Inbox />} title={qTab === 'for-you' ? t('home.forYou') : t('home.unanswered')} subtitle={qTab === 'unanswered' ? t('home.unansweredHint') : undefined} />
        <Segmented
          label={t('nav.sos')}
          size="sm"
          glow
          value={qTab}
          onChange={setQTab}
          items={[
            { value: 'for-you', label: t('sos.tabs.for-me'), count: data?.openInMyStacks.length },
            { value: 'unanswered', label: t('sos.tabs.unanswered'), count: data?.unanswered.length },
          ]}
        />
      </div>
      <div className="mt-4">
        {!data ? (
          <ListSkeleton rows={3} />
        ) : (qTab === 'for-you' ? data.openInMyStacks : data.unanswered).length === 0 ? (
          <EmptyState compact pose="celebrate" title={qTab === 'for-you' ? t('home.forYouEmpty') : t('home.unansweredEmpty')} />
        ) : (
          <div className="dh-stagger flex flex-col gap-2.5">
            {(qTab === 'for-you' ? data.openInMyStacks : data.unanswered).slice(0, 4).map((q) => (
              <QuestionCard key={q.id} q={q} showBlocked={qTab === 'unanswered'} />
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-end">
        <ButtonLink to={`/sos?tab=${qTab === 'for-you' ? 'for-me' : 'unanswered'}`} variant="ghost" size="sm">
          {t('common.seeAll')}
          <ChevronRight />
        </ButtonLink>
      </div>
    </Card>
  )

  const tasksBlock = (
    <Card className="p-4 sm:p-5" key="tasks">
      <CardHeader icon={<FolderGit2 />} title={t('home.myTasks')} />
      <div className="mt-4">
        {!data ? (
          <ListSkeleton rows={2} className="h-16" />
        ) : data.myTasks.length === 0 ? (
          <EmptyState compact pose="point" title={t('home.myTasksEmpty')} action={<ButtonLink to="/projets" size="sm" variant="secondary">{t('nav.projects')}</ButtonLink>} />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.myTasks.map((task, i) => (
              <TaskTile key={task.id} index={i} title={task.title} room={task.room.name} href={`/p/${task.room.inviteCode}?tab=tasks`} status={t(`room.columns.${task.status}`)} level={task.level} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )

  const meetBlock = (
    <Card className="p-4 sm:p-5" key="meet">
      <CardHeader
        icon={<Users />}
        title={t('home.meet')}
        action={
          <ButtonLink to="/decouvrir" variant="pill" size="xs">
            {t('common.seeAll')}
          </ButtonLink>
        }
      />
      <div className="mt-4">
        {!data ? (
          <ListSkeleton rows={2} className="h-40" />
        ) : data.devsToMeet.length === 0 ? (
          <EmptyState compact title={t('home.meetEmpty')} />
        ) : (
          <div className="dh-stagger grid gap-3">
            {data.devsToMeet.slice(0, 2).map(({ dev, reason }) => (
              <DevCard key={dev.id} dev={dev} reason={t(reason.key, reason.params)} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )

  const roomsBlock = (
    <section key="rooms" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-fg">{t('home.rooms')}</h2>
        <ButtonLink to="/projets" variant="pill" size="xs">
          {t('common.seeAll')}
        </ButtonLink>
      </div>
      {!data ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-52 rounded-[20px]" />
          <Skeleton className="h-52 rounded-[20px]" />
        </div>
      ) : data.recommendedRooms.length === 0 ? (
        <EmptyState compact title={t('home.roomsEmpty')} />
      ) : (
        <div className="dh-stagger grid gap-3 md:grid-cols-2">
          {data.recommendedRooms.slice(0, 2).map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      )}
    </section>
  )

  const activityBlock = (
    <Card className="p-4 sm:p-5" key="activity">
      <CardHeader icon={<Radio />} title={t('home.activity')} />
      <div className="mt-5">{data ? <ActivityFeed items={data.activity.slice(0, 7)} /> : <Skeleton className="h-72 rounded-[14px]" />}</div>
    </Card>
  )

  const myQuestionsBlock =
    data && data.myQuestions.length > 0 ? (
      <Card className="p-4 sm:p-5" key="mine">
        <CardHeader icon={<Clock3 />} title={t('home.myQuestions')} />
        <div className="mt-4 flex flex-col gap-2.5">
          {data.myQuestions.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </div>
      </Card>
    ) : null

  // T3 : le QG réordonne ses blocs selon l'intention déclarée.
  const intent = me.intent ?? 'get-help'
  const mainOrder: ReactNode[] =
    intent === 'find-project' || intent === 'start-project' ? [roomsBlock, questionsBlock, myQuestionsBlock] : intent === 'get-help' ? [myQuestionsBlock, questionsBlock, roomsBlock] : [questionsBlock, myQuestionsBlock, roomsBlock]

  if (error) return <div className="p-6"><ErrorState error={error} onRetry={refresh} /></div>

  const xp = passport?.totalXp ?? 0
  const topSkill = passport?.skills[0]

  const availableNow = (devs ?? []).filter((d) => d.availability.status === 'now')

  return (
    <div className="flex">
    <div className="dh-page mx-auto w-full max-w-[1320px] min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
      {/* Salutation + titre (images 01 et 02) */}
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-[15px] font-medium text-muted">{t(greetingKey(), { name: firstName })}</p>
        <h1 className="text-[30px] font-bold leading-none tracking-[-0.035em] text-fg sm:text-[38px]">{t('home.title')}</h1>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Bannière hero (image 01) */}
        <section data-tour="hero" className="relative overflow-hidden rounded-[24px] bg-hero p-6 text-on-hero shadow-accent sm:p-8 xl:col-span-2">
          <img src={heroHub}
          srcSet={`${heroHubSm} 360w, ${heroHub} 600w`}
          sizes="(max-width: 640px) 360px, 600px" alt="" width={600} height={573} className="pointer-events-none absolute -right-16 -bottom-28 w-[340px] max-w-none opacity-50 sm:-right-16 sm:-bottom-24 sm:w-[400px] sm:opacity-95" />
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,var(--accent-strong)_0%,color-mix(in_oklab,var(--accent-strong),transparent_35%)_45%,transparent_75%)] sm:block" />
        <div className="relative max-w-md">
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.03em] sm:text-[32px]">{t('home.heroTitle')}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-on-hero-muted">{t('home.heroText')}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="contrast" size="lg" icon={<Zap />} onClick={() => setAsk(true)} data-tour="hero-ask">
                {t('home.heroCta')}
              </Button>
              <Link to="/sos?tab=resolved" className="inline-flex items-center gap-1 text-sm font-medium text-on-hero-muted hover:text-on-hero">
                {t('home.heroSecondary')}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            {availableNow.length > 0 && (
              <Link to="/decouvrir?avail=now" className="mt-6 inline-flex items-center gap-3 rounded-full bg-on-hero/12 py-1.5 pr-4 pl-1.5 text-[13px] font-medium text-on-hero backdrop-blur-md transition-colors hover:bg-on-hero/20">
                <span className="flex -space-x-2">
                  {availableNow.slice(0, 5).map((d) => (
                    <Avatar key={d.id} name={d.displayName} src={d.avatarUrl} size={28} className="ring-2 ring-[color-mix(in_oklab,var(--accent-strong),white_10%)]" />
                  ))}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
                  {t('home.availableNow', { count: availableNow.length })}
                </span>
              </Link>
            )}
          </div>
        </section>

        {/* Carte XP (image 02 : carte à bordure lumineuse) */}
        <Link to={`/u/${me.handle}`} data-tour="xp" className="glow-border group relative flex flex-col overflow-hidden rounded-[24px] bg-surface-1 p-5 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[var(--gradient-glow)]" />
          <div className="relative flex items-start justify-between">
            <IconChip tone="success">
              <Award />
            </IconChip>
            <Djeli pose="celebrate" size={72} className="-mt-2 -mr-2" />
          </div>
          <p className="relative mt-2 text-[13px] text-muted">{t('home.myXp')}</p>
          <p className="relative text-[44px] font-bold leading-none tracking-tight tabular text-fg">{passport ? formatNumber(xp, lang) : '—'}</p>
          <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <p className="font-semibold text-fg tabular">{passport?.stats.devsUnblocked ?? '—'}</p>
              <p className="text-xs text-subtle">{t('home.unblocked')}</p>
            </div>
            <div>
              <p className="font-semibold text-fg">{passport?.countryRank ? `#${passport.countryRank}` : '—'}</p>
              <p className="text-xs text-subtle">{passport?.countryRank ? countryName(me.country, lang) : t('home.noRank')}</p>
            </div>
          </div>
          {topSkill && (
            <p className="relative mt-3 inline-flex items-center gap-1.5 text-xs text-accent-text">
              <Sparkles className="size-3.5" />
              {topSkill.tag.label} · {topSkill.score}/100 · {t(`passport.level.${topSkill.level}`)}
            </p>
          )}
        </Link>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">{mainOrder}</div>
        <div className="flex min-w-0 flex-col gap-4">
          {tasksBlock}
          {meetBlock}
          {activityBlock}
        </div>
      </div>
    </div>
      <aside className="sticky top-[var(--topbar-h)] hidden h-[calc(100dvh-var(--topbar-h))] w-[260px] shrink-0 overflow-y-auto border-l border-line bg-[color-mix(in_oklab,var(--bg-nav),transparent_30%)] px-2.5 py-6 min-[1600px]:block">
        <MembersPanel />
      </aside>
    </div>
  )
}

/** Tuile de tâche façon « cartes date empilées » (image 01) : pastel, couche derrière, violet au survol. */
const TILE_TONES = ['bg-lavender', 'bg-sky', 'bg-rose', 'bg-amber']
function TaskTile({ index, title, room, href, status, level }: { index: number; title: string; room: string; href: string; status: string; level: string }) {
  const { t } = useTranslation()
  return (
    <li>
      <Link to={href} className="group relative flex items-center gap-3 rounded-[16px] p-1.5 pr-3 transition-colors hover:bg-accent-strong">
        <span className="relative shrink-0">
          <span aria-hidden className={cn('absolute inset-x-1 -bottom-1.5 h-full rounded-[12px] opacity-60', TILE_TONES[index % 4])} />
          <span className={cn('relative grid size-14 place-items-center rounded-[12px] text-pastel-fg shadow-sm', TILE_TONES[index % 4])}>
            <FolderGit2 className="size-5" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg group-hover:text-on-accent">{title}</span>
          <span className="block truncate text-xs text-subtle group-hover:text-on-accent/80">
            {room} · {t(`room.level.${level}`)}
          </span>
          <span className="mt-1 inline-block rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-accent-text group-hover:bg-on-hero/20 group-hover:text-on-accent">{status}</span>
        </span>
        <ChevronRight className="size-4 text-subtle group-hover:text-on-accent" />
      </Link>
    </li>
  )
}
