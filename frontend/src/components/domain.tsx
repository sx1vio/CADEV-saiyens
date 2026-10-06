import { BadgeCheck, CheckCircle2, CircleDot, FolderGit2, GitPullRequestArrow, Hand, MessageSquareText, Sparkles, UserPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { duration, errorKey, relativeTime, useLang } from '@/i18n'
import { countryName, formatUtc } from '@/lib/geo'
import { prefetch } from '@/lib/query'
import { cn } from '@/lib/utils'
import { api, type ActivityItem, type DevCard as DevCardT, type QuestionListItem, type RoomListItem, type UserSummary } from '@/services'
import { useSession } from '@/stores/app'
import { Avatar, AvatarStack, Badge, StatusDot, TechTag } from './ui/primitives'
import { ScoreBar } from './ui/data'

/* ---------------- Préchargement au survol (règle de navigation n°2) ---------------- */

export const preload = {
  question: (id: string) => prefetch(`question:${id}`, () => api.getQuestion(id)),
  room: (code: string) => prefetch(`room:${code}`, () => api.getRoom(code)),
  passport: (handle: string) => prefetch(`passport:${handle}`, () => api.getPassport(handle)),
}

/* ---------------- Utilisateurs ---------------- */

export function DemoBadge({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <Badge tone="outline" size="sm" className={cn('font-semibold uppercase tracking-wide', className)} title={t('common.demoDataHint')}>
      {t('common.demo')}
    </Badge>
  )
}

export function UserLink({ user, size = 24, showDemo = true, className, muted, noAvatar }: { user: UserSummary; size?: number; showDemo?: boolean; className?: string; muted?: boolean; noAvatar?: boolean }) {
  return (
    <Link
      to={`/u/${user.handle}`}
      onMouseEnter={() => preload.passport(user.handle)}
      onFocus={() => preload.passport(user.handle)}
      className={cn('group inline-flex min-w-0 items-center gap-2', className)}
    >
      {!noAvatar && <Avatar name={user.displayName} src={user.avatarUrl} size={size} />}
      <span className={cn('truncate font-semibold group-hover:underline group-hover:decoration-1 group-hover:underline-offset-2', muted ? 'text-muted' : 'text-fg')}>{user.displayName}</span>
      {showDemo && user.isDemo && <DemoBadge />}
    </Link>
  )
}

/* ---------------- Questions ---------------- */

export function QuestionCard({ q, className, showBlocked }: { q: QuestionListItem; className?: string; showBlocked?: boolean }) {
  const { t } = useTranslation()
  const lang = useLang()
  const me = useSession((s) => s.user)
  const resolved = q.status === 'resolved'
  const blockedMin = (Date.now() - new Date(q.createdAt).getTime()) / 60000
  return (
    <Link
      to={`/sos/${q.id}`}
      onMouseEnter={() => preload.question(q.id)}
      onFocus={() => preload.question(q.id)}
      className={cn(
        'group flex gap-3.5 rounded-[16px] border border-line bg-surface-2 p-4 transition-[border-color,background-color,transform] duration-150 hover:border-line-strong hover:bg-[color-mix(in_oklab,var(--surface-2),var(--surface-3)_45%)] active:scale-[0.995]',
        className,
      )}
    >
      <div className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-[11px]', resolved ? 'bg-success-soft text-success' : q.urgency === 'high' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-text')}>
        {resolved ? <CheckCircle2 className="size-[18px]" /> : <CircleDot className="size-[18px]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 flex-1 text-[15px] font-semibold leading-snug text-fg">{q.title}</h3>
          {q.urgency === 'high' && !resolved && (
            <Badge tone="danger" size="sm" className="mt-0.5">
              {t('sos.urgency.high')}
            </Badge>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {q.tags.slice(0, 4).map((tag) => (
            <TechTag key={tag.id} label={tag.label} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-subtle">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Avatar name={q.author.displayName} src={q.author.avatarUrl} size={18} />
            <span className="truncate text-muted">{q.author.id === me?.id ? t('common.you') : q.author.displayName}</span>
            {q.author.isDemo && <DemoBadge />}
          </span>
          <span>{showBlocked && !resolved ? t('home.blockedFor', { time: duration(blockedMin, lang) }) : relativeTime(q.createdAt, lang)}</span>
          <span className={cn('inline-flex items-center gap-1', q.answerCount === 0 && !resolved && 'text-warning')}>
            <MessageSquareText className="size-3.5" />
            {q.answerCount ? t('sos.answers', { count: q.answerCount }) : t('sos.noAnswer')}
          </span>
          {q.claimedBy && !resolved && (
            <span className="inline-flex items-center gap-1 text-accent-text">
              <Hand className="size-3.5" />
              {t('sos.claimedBy', { name: q.claimedBy.displayName })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ---------------- Salles ---------------- */

const STATE_TONE = { idea: 'amber', building: 'sky', beta: 'lavender', live: 'mint' } as const

export function RoomCard({ room, className }: { room: RoomListItem; className?: string }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/p/${room.inviteCode}`}
      onMouseEnter={() => preload.room(room.inviteCode)}
      onFocus={() => preload.room(room.inviteCode)}
      className={cn('group flex flex-col gap-3 rounded-[20px] border border-line bg-surface-2 p-4 transition-[border-color,transform] duration-150 hover:border-line-strong active:scale-[0.995] sm:p-5', className)}
    >
      <div className="flex items-start gap-3">
        <RoomMark name={room.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold text-fg">{room.name}</h3>
            <Badge tone={STATE_TONE[room.state]} size="sm">
              {t(`projects.state.${room.state}`)}
            </Badge>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{room.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {room.tags.slice(0, 4).map((tag) => (
          <TechTag key={tag.id} label={tag.label} />
        ))}
      </div>
      {room.wantedRoles.length > 0 && (
        <p className="line-clamp-1 text-[12.5px] text-subtle">
          <span className="font-medium text-muted">{t('projects.wanted')} · </span>
          {room.wantedRoles.join(', ')}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[12.5px]">
        <AvatarStack people={room.members} size={22} />
        <span className={cn('inline-flex items-center gap-1.5 font-medium', room.openTasks ? 'text-accent-text' : 'text-subtle')}>
          <FolderGit2 className="size-3.5" />
          {t('projects.openTasks', { count: room.openTasks })}
        </span>
      </div>
    </Link>
  )
}

/** Monogramme coloré d'une salle (comme une icône de serveur Discord). */
export function RoomMark({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const tones = ['bg-lavender', 'bg-sky', 'bg-rose', 'bg-amber', 'bg-mint']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.4 }} className={cn('grid shrink-0 place-items-center rounded-[30%] font-bold text-pastel-fg', tones[h % tones.length], className)}>
      {name.slice(0, 2)}
    </span>
  )
}

/* ---------------- Devs ---------------- */

export function DevCard({ dev, reason, className }: { dev: DevCardT; reason?: ReactNode; className?: string }) {
  const { t } = useTranslation()
  const lang = useLang()
  return (
    <Link
      to={`/u/${dev.handle}`}
      onMouseEnter={() => preload.passport(dev.handle)}
      onFocus={() => preload.passport(dev.handle)}
      className={cn('group flex flex-col gap-3 rounded-[20px] border border-line bg-surface-2 p-4 transition-[border-color,transform] duration-150 hover:border-line-strong active:scale-[0.995]', className)}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar name={dev.displayName} src={dev.avatarUrl} size={44} />
          <StatusDot tone={dev.availability.status === 'now' ? 'success' : dev.availability.status === 'today' ? 'warning' : 'neutral'} className="absolute -right-0.5 -bottom-0.5 size-3 ring-2 ring-surface-2" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-fg">{dev.displayName}</span>
            {dev.isDemo && <DemoBadge />}
          </div>
          <div className="truncate text-[12.5px] text-subtle">
            {[dev.city, countryName(dev.country, lang)].filter(Boolean).join(', ')} · {formatUtc(dev.utcOffset)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold tabular text-fg">{dev.totalXp}</div>
          <div className="text-[10.5px] text-subtle">XP</div>
        </div>
      </div>
      {reason && <p className="rounded-[10px] bg-accent-soft px-2.5 py-1.5 text-[12.5px] font-medium text-accent-text">{reason}</p>}
      <div className="flex flex-col gap-2">
        {dev.topSkills.slice(0, 3).map((s) => (
          <div key={s.tagId} className="flex items-center gap-2.5">
            <span className="w-24 truncate font-mono text-[11.5px] text-muted">{s.tag.label}</span>
            <ScoreBar g={s.githubSignal} p={Math.min(60, s.xpTag)} height={6} className="flex-1" />
            <span className="w-6 text-right text-[11.5px] font-semibold tabular text-fg">{s.score}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {dev.availability.forMission && (
          <Badge tone="success" size="sm">
            <BadgeCheck />
            {t('passport.mission')}
          </Badge>
        )}
        {dev.languages.map((l) => (
          <Badge key={l} tone="outline" size="sm" className="uppercase">
            {l}
          </Badge>
        ))}
      </div>
    </Link>
  )
}

/* ---------------- Fil d'activité (image 05) ---------------- */

const ACTIVITY_ICON = {
  resolved: { icon: CheckCircle2, tone: 'bg-success-soft text-success' },
  answered: { icon: MessageSquareText, tone: 'bg-blue-soft text-blue-text' },
  asked: { icon: Sparkles, tone: 'bg-accent-soft text-accent-text' },
  joined: { icon: UserPlus, tone: 'bg-sky text-pastel-fg' },
  'task-done': { icon: GitPullRequestArrow, tone: 'bg-mint text-pastel-fg' },
  'room-created': { icon: FolderGit2, tone: 'bg-amber text-pastel-fg' },
} as const

export function ActivityFeed({ items, className }: { items: ActivityItem[]; className?: string }) {
  const lang = useLang()
  const { t } = useTranslation()
  const verb = (k: ActivityItem['kind']) => t(`activity.${k}`)
  return (
    <ol className={cn('relative flex flex-col', className)}>
      {items.map((it, i) => {
        const I = ACTIVITY_ICON[it.kind]
        return (
          <li key={it.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 && <span aria-hidden className="absolute top-9 bottom-0 left-[15px] w-px bg-line" />}
            <span className={cn('relative z-10 grid size-[31px] shrink-0 place-items-center rounded-[10px]', I.tone)}>
              <I.icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-muted">
                  <Link to={`/u/${it.actor.handle}`} className="font-semibold text-fg hover:underline">
                    {it.actor.displayName}
                  </Link>{' '}
                  {verb(it.kind)}{' '}
                  <Link to={it.targetHref} className="font-semibold text-fg hover:underline">
                    {it.targetLabel}
                  </Link>
                  {it.kind === 'resolved' && it.detail && <span className="text-success"> · {t('landing.minutes', { count: Number(it.detail) })}</span>}
                </p>
                <time dateTime={it.createdAt} className="shrink-0 text-xs text-subtle">
                  {relativeTime(it.createdAt, lang)}
                </time>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------------- En-tête de page ---------------- */

export function PageHeader({ eyebrow, title, subtitle, actions, className }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[15px] font-medium text-muted">{eyebrow}</p>}
        <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-fg sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function errorText(t: (k: string, o?: Record<string, unknown>) => string, err: unknown) {
  const code = (err as { code?: string })?.code
  if (code) {
    const msg = t(errorKey(code), { defaultValue: '' })
    if (msg) return msg
  }
  return t('errors.generic')
}
