import {
  Award,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Code2,
  FolderGit2,
  Globe2,
  HandHelping,
  Mail,
  MapPin,
  Settings,
  Share2,
  Sparkles,
  Star,
  Undo2,
  Users,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import heroHub from '@/assets/hero-hub.webp'
import { EmptyState, ErrorState } from '@/components/djeli'
import { DemoBadge, RoomCard } from '@/components/domain'
import { GitHubIcon } from '@/components/icons'
import { Button, ButtonLink } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code'
import { Heatmap, LevelBadge, ScoreBar } from '@/components/ui/data'
import { Sheet } from '@/components/ui/overlay'
import { Avatar, Badge, Card, CardHeader, IconChip, Skeleton, StatusDot, TechTag } from '@/components/ui/primitives'
import { duration, formatDate, formatNumber, relativeTime, useLang } from '@/i18n'
import { countryName, formatUtc } from '@/lib/geo'
import { useQuery } from '@/lib/query'
import { cn } from '@/lib/utils'
import { api, type Passport as PassportT, type SkillView, type XPEvent } from '@/services'
import { useSession } from '@/stores/app'
import { Page } from './_layout'

/** Developer Passport (PR2, PR3, PR4, PR7, PR8, PR11, X1, Y6) — public, lisible sans compte. */
export default function Passport() {
  const { handle = '' } = useParams()
  const { t } = useTranslation()
  const lang = useLang()
  const me = useSession((s) => s.user)
  const { data: p, error, refresh } = useQuery<PassportT>(`passport:${handle}`, () => api.getPassport(handle))
  const { data: status } = useQuery('status:lite', () => api.getStatus())
  const [proofSkill, setProofSkill] = useState<SkillView | null>(null)
  const [contact, setContact] = useState(false)

  if (error)
    return (
      <Page>
        {(error as { code?: string }).code === 'not-found' ? (
          <EmptyState pose="laptop" title={t('passport.notFound')} action={<ButtonLink to="/decouvrir" variant="secondary">{t('nav.discover')}</ButtonLink>} />
        ) : (
          <ErrorState error={error} onRetry={refresh} />
        )}
      </Page>
    )
  if (!p) return <PassportSkeleton />

  const u = p.user
  const isMe = me?.id === u.id
  const ghYears = Math.max(1, Math.floor((Date.now() - new Date(u.githubCreatedAt).getTime()) / (365 * 864e5)))
  const proofsBySkill = (tagId: string) => p.proofs.filter((e) => e.kind !== 'revert' && (e.tagIds ?? [e.tagId]).includes(tagId))

  const share = () => {
    const url = `${location.origin}/u/${u.handle}`
    if (navigator.share) void navigator.share({ title: `${u.displayName} · DevHub Africa`, url }).catch(() => {})
    else {
      void navigator.clipboard?.writeText(url)
      toast.success(t('passport.shareCopied'))
    }
  }

  return (
    <Page wide>
      {/* -------- Identité -------- */}
      <section className="glow-border relative overflow-hidden rounded-[28px] bg-surface-1 shadow-[var(--shadow-card)]">
        <div className="relative h-32 overflow-hidden bg-hero sm:h-40">
          <img src={heroHub} alt="" className="absolute -top-16 right-0 w-[460px] max-w-none opacity-80 sm:right-10" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,color-mix(in_oklab,var(--surface-1),transparent_10%))]" />
        </div>
        <div className="relative -mt-14 flex flex-col gap-6 px-5 pb-6 sm:px-8 sm:pb-8 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-4 sm:flex-row sm:gap-5">
            <div className="relative">
              <Avatar name={u.displayName} src={u.avatarUrl} size={112} className="text-3xl ring-[6px] ring-surface-1 shadow-lg" />
              <StatusDot tone={u.availability.status === 'now' ? 'success' : u.availability.status === 'today' ? 'warning' : 'neutral'} className="absolute right-2 bottom-2 size-5 ring-[5px] ring-surface-1" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-fg sm:text-[32px]">{u.displayName}</h1>
                {u.isDemo && <DemoBadge />}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span>@{u.handle}</span>
                {(u.city || u.country) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {[u.city, countryName(u.country, lang)].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3.5" />
                  {formatUtc(u.utcOffset)}
                </span>
                <span className="inline-flex items-center gap-1 uppercase">
                  <Globe2 className="size-3.5" />
                  {u.languages.join(' / ')}
                </span>
              </p>
              {/* PR11 : signaux de confiance */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="outline" size="sm">
                  <GitHubIcon />
                  {t('common.githubYears', { count: ghYears })}
                </Badge>
                {u.emailVerified && (
                  <Badge tone="outline" size="sm">
                    <BadgeCheck />
                    {t('common.emailVerified')}
                  </Badge>
                )}
                {u.isFounder && (
                  <Badge tone="amber" size="sm">
                    <Star />
                    {t('common.founder')}
                  </Badge>
                )}
                <Badge tone={u.availability.status === 'now' ? 'success' : 'neutral'} size="sm">
                  {t(`passport.available.${u.availability.status}`)}
                </Badge>
                {u.availability.forMission && (
                  <Badge tone="success" size="sm">
                    <BadgeCheck />
                    {t('passport.mission')}
                  </Badge>
                )}
              </div>
              {u.bio && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg">{u.bio}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-4 lg:items-end">
            <div className="flex items-baseline gap-2 lg:flex-col lg:items-end lg:gap-0">
              <span className="text-[44px] font-bold leading-none tracking-tight tabular text-fg">{formatNumber(p.totalXp, lang)}</span>
              <span className="text-sm text-muted">Proof XP</span>
            </div>
            {p.countryRank && (
              <Link to="/classement" className="text-sm font-medium text-accent-text hover:underline">
                {t('passport.rank', { rank: p.countryRank, country: countryName(u.country, lang) })}
              </Link>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Share2 />} onClick={share}>
                {t('passport.share')}
              </Button>
              {isMe ? (
                <ButtonLink to="/reglages" variant="ghost" icon={<Settings />}>
                  {t('passport.edit')}
                </ButtonLink>
              ) : (
                <Button variant="primary" icon={<Mail />} onClick={() => setContact(true)}>
                  {t('passport.contact')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* -------- Statistiques (image 02 : grands chiffres) -------- */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: <Users />, tone: 'accent' as const, value: p.stats.devsUnblocked, label: t('passport.stats.unblocked') },
          { icon: <Clock3 />, tone: 'blue' as const, value: p.stats.medianResponseMinutes !== null ? duration(p.stats.medianResponseMinutes, lang) : '—', label: t('passport.stats.median') },
          { icon: <FolderGit2 />, tone: 'success' as const, value: p.stats.contributions, label: t('passport.stats.contributions') },
          { icon: <CheckCircle2 />, tone: 'warning' as const, value: p.stats.answersAccepted, label: t('passport.stats.accepted') },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4 sm:p-5">
            <IconChip tone={s.tone}>{s.icon}</IconChip>
            <div className="min-w-0">
              <p className="text-[24px] font-bold leading-none tracking-tight tabular text-fg sm:text-[28px]">{s.value}</p>
              <p className="mt-1 truncate text-[12.5px] text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          {/* -------- Compétences G + P (PR3, PR7) -------- */}
          <Card className="p-5 sm:p-6">
            <CardHeader
              icon={<Code2 />}
              title={t('passport.skills')}
              action={
                <Link to="/regles" className="text-xs font-medium text-accent-text hover:underline">
                  {t('passport.howScore')}
                </Link>
              }
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-score-g" /> {t('passport.legendG')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-score-p" /> {t('passport.legendP')}
              </span>
            </div>
            {p.skills.length === 0 ? (
              <p className="mt-5 text-sm text-muted">{t('passport.noProofs')}</p>
            ) : (
              <ul className="dh-stagger mt-5 flex flex-col gap-4">
                {p.skills.slice(0, 8).map((s) => (
                  <li key={s.tagId} className="grid grid-cols-[minmax(0,110px)_1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[140px_1fr_auto_auto]">
                    <span className="truncate font-mono text-[13px] font-medium text-fg">{s.tag.label}</span>
                    <ScoreBar g={s.githubSignal} p={Math.min(60, s.xpTag)} />
                    <LevelBadge level={s.level} score={s.score} />
                    <Button variant="pill" size="xs" onClick={() => setProofSkill(s)} className="col-span-3 justify-self-start sm:col-span-1">
                      {t('passport.seeProofs')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* -------- Chronologie des preuves (image 05) -------- */}
          <Card className="p-5 sm:p-6">
            <CardHeader icon={<Award />} title={t('passport.timeline')} />
            {p.proofs.filter((e) => e.kind !== 'revert').length === 0 ? (
              <p className="mt-5 text-sm text-muted">{t('passport.noTimeline')}</p>
            ) : (
              <ProofTimeline proofs={p.proofs.filter((e) => e.kind !== 'revert').slice(0, 14)} />
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* -------- Heatmap (PR8) -------- */}
          <Card className="p-5">
            <CardHeader icon={<CalendarDays />} title={t('passport.heatmap')} />
            <Heatmap days={p.heatmap} className="mt-4" />
          </Card>

          {(u.canHelpWith.length > 0 || u.wantsToLearn.length > 0) && (
            <Card className="flex flex-col gap-4 p-5">
              {u.canHelpWith.length > 0 && <ChipList icon={<HandHelping />} label={t('passport.canHelp')} ids={u.canHelpWith} />}
              {u.wantsToLearn.length > 0 && <ChipList icon={<Sparkles />} label={t('passport.wantsToLearn')} ids={u.wantsToLearn} />}
            </Card>
          )}

          {isMe && p.skills[0] && (
            <Card className="p-5">
              <CardHeader icon={<Zap />} title={t('passport.badge')} subtitle={t('passport.badgeHint')} />
              <CodeBlock
                className="mt-3"
                lang="markdown"
                code={`[![DevHub · ${p.skills[0].tag.label} ${p.skills[0].score}](${location.origin}/badge/${u.handle}/${p.skills[0].tag.slug}.svg)](${location.origin}/u/${u.handle})`}
              />
            </Card>
          )}

          <Card className="p-5">
            <CardHeader icon={<FolderGit2 />} title={t('passport.rooms')} />
            {p.rooms.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t('passport.noRooms')}</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {p.rooms.slice(0, 3).map((r) => (
                  <RoomCard key={r.id} room={r} className="p-4" />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Y6 : Systalink visible dans le parcours */}
      <p className="mt-6 flex flex-wrap items-center gap-2 text-xs text-subtle">
        <CloudUpload className="size-3.5" />
        {status?.lastBackupAt && t('passport.savedAt', { time: relativeTime(status.lastBackupAt, lang) })}
        <span>·</span>
        {t('passport.memberSince', { date: formatDate(u.createdAt, lang, { month: 'long', year: 'numeric' }) })}
        <span>·</span>
        <Link to="/systalink" className="hover:text-fg hover:underline">
          Systalink
        </Link>
      </p>

      {/* PR3 : décomposition d'un score et ses sources */}
      <Sheet open={!!proofSkill} onOpenChange={(o) => !o && setProofSkill(null)} title={proofSkill ? t('passport.proofsFor', { tag: proofSkill.tag.label }) : ''} side="right" size="sm">
        {proofSkill && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-[16px] bg-surface-2 p-4">
              <LevelBadge level={proofSkill.level} score={proofSkill.score} />
              <span className="text-sm text-subtle">/ 100</span>
            </div>
            <ScoreBar g={proofSkill.githubSignal} p={Math.min(60, proofSkill.xpTag)} height={10} />
            <div className="flex flex-col gap-2 text-sm">
              <p className="flex items-start gap-2">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-sm bg-score-g" />
                <span className="text-fg">{t('passport.gPart', { repos: proofSkill.githubRepos, g: proofSkill.githubSignal })}</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-sm bg-score-p" />
                <span className="text-fg">{t('passport.pPart', { p: Math.min(60, proofSkill.xpTag), tag: proofSkill.tag.label })}</span>
              </p>
            </div>
            {proofsBySkill(proofSkill.tagId).length ? (
              <ProofTimeline proofs={proofsBySkill(proofSkill.tagId)} />
            ) : (
              <p className="text-sm text-muted">{t('passport.noProofs')}</p>
            )}
            <Link to="/regles" className="text-xs font-medium text-accent-text hover:underline">
              {t('passport.howScore')}
            </Link>
          </div>
        )}
      </Sheet>

      <Sheet open={contact} onOpenChange={setContact} title={`${t('passport.contact')} · ${u.displayName}`} description={t('passport.contactHint')} size="sm">
        <p className="rounded-[14px] bg-surface-2 p-4 text-sm text-muted">{t('passport.contactSoon')}</p>
      </Sheet>
    </Page>
  )
}

function ChipList({ icon, label, ids }: { icon: React.ReactNode; label: string; ids: string[] }) {
  const { data: tags = [] } = useQuery('tags', () => api.listTags())
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-fg [&_svg]:size-4 [&_svg]:text-accent-text">
        {icon}
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const tag = tags.find((x) => x.id === id)
          return tag ? <TechTag key={id} label={tag.label} /> : null
        })}
      </div>
    </div>
  )
}

/** Chaque ligne renvoie à sa source (X1 : chaque point renvoie à un événement). */
function ProofTimeline({ proofs }: { proofs: XPEvent[] }) {
  const { t } = useTranslation()
  const lang = useLang()
  return (
    <ol className="relative mt-5 flex flex-col">
      {proofs.map((e, i) => {
        const reverted = !!e.revertedAt
        const body = (
          <>
            <span className={cn('relative z-10 grid h-8 min-w-11 shrink-0 place-items-center rounded-[10px] px-1.5 text-[13px] font-bold tabular', reverted ? 'bg-surface-3 text-subtle line-through' : e.kind === 'fast-bonus' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success')}>
              +{e.points}
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block text-[13.5px] font-medium text-fg">
                {t(`passport.proof.${e.kind}`)}
                {reverted && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-danger">
                    <Undo2 className="size-3" />
                    {t('passport.reverted')}
                  </span>
                )}
              </span>
              <span className="block truncate text-[12.5px] text-muted">{e.sourceLabel}</span>
            </span>
            <time className="shrink-0 pt-0.5 text-xs text-subtle">{relativeTime(e.createdAt, lang)}</time>
          </>
        )
        return (
          <li key={e.id} className="relative pb-3 last:pb-0">
            {i < proofs.length - 1 && <span aria-hidden className="absolute top-8 bottom-0 left-[21px] w-px bg-line" />}
            {e.sourceHref ? (
              <Link to={e.sourceHref} className="flex items-start gap-3 rounded-[12px] transition-colors hover:bg-surface-3/50">
                {body}
              </Link>
            ) : (
              <div className="flex items-start gap-3">{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function PassportSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="h-52 rounded-[28px]" />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-[16px]" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-96 rounded-[16px] xl:col-span-2" />
        <Skeleton className="h-96 rounded-[16px]" />
      </div>
    </div>
  )
}
