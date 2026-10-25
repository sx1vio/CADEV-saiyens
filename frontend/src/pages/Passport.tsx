import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  CloudUpload,
  FolderGit2,
  HandHelping,
  Mail,
  MapPin,
  Share2,
  Sparkles,
  Star,
  Undo2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState } from '@/components/djeli'
import { DemoBadge } from '@/components/domain'
import { Button, ButtonLink } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code'
import { Heatmap, LevelBadge, ScoreBar } from '@/components/ui/data'
import { Sheet } from '@/components/ui/overlay'
import { Avatar, Skeleton, TechTag } from '@/components/ui/primitives'
import { duration, formatDate, formatNumber, relativeTime, useLang } from '@/i18n'
import { countryName, formatUtc } from '@/lib/geo'
import { useQuery } from '@/lib/query'
import { cn } from '@/lib/utils'
import { api, type Passport as PassportT, type SkillView, type XPEvent } from '@/services'
import { useSession } from '@/stores/app'
import { Page } from './_layout'
import { BrandLogo } from '@/platform/logos'
import { PLATFORM_CERTS } from '@/platform/data/certs'
import { usePlatform } from '@/platform/store'
import { CUBE, CertBadge, StatCard } from '@/platform/ui'

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
  const [tab, setTab] = useState<'overview' | 'skills' | 'projects' | 'activity'>('overview')
  const certResults = usePlatform((st) => st.certResults)

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

  const badges = isMe ? PLATFORM_CERTS.filter((c) => certResults[c.id]?.passed) : []
  const proofs = p.proofs.filter((e) => e.kind !== 'revert')

  return (
    <div className="dh-page mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* -------- Colonne d'identité (façon GitHub) -------- */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[296px]">
          <div className="flex items-center gap-4 lg:block">
            <div className="relative w-fit">
              <Avatar name={u.displayName} src={u.avatarUrl} size={240} className="hidden border border-line lg:block" />
              <Avatar name={u.displayName} src={u.avatarUrl} size={88} className="border border-line lg:hidden" />
              <span
                title={t(`passport.available.${u.availability.status}`)}
                className={cn('absolute right-[8%] bottom-[8%] size-5 rounded-full ring-4 ring-canvas lg:size-7', u.availability.status === 'now' ? 'bg-success' : u.availability.status === 'today' ? 'bg-warning' : 'bg-subtle')}
              />
            </div>
            <div className="min-w-0 lg:mt-4">
              <h1 className="flex flex-wrap items-center gap-2 text-[28px] leading-tight font-bold tracking-[-0.028em] text-fg">
                {u.displayName}
                {u.isDemo && <DemoBadge />}
              </h1>
              <p className="text-[18px] font-light text-muted">@{u.handle}</p>
            </div>
          </div>
          {u.bio && <p className="text-[14px] leading-relaxed text-fg">{u.bio}</p>}
          <div className="flex gap-2">
            {isMe ? (
              <ButtonLink to="/reglages" variant="secondary" className="flex-1">
                {t('passport.edit')}
              </ButtonLink>
            ) : (
              <Button variant="primary" icon={<Mail />} onClick={() => setContact(true)} className="flex-1">
                {t('passport.contact')}
              </Button>
            )}
            <Button variant="secondary" icon={<Share2 />} onClick={share} aria-label={t('passport.share')} />
          </div>
          <ul className="flex flex-col gap-1.5 text-[13.5px] text-muted">
            {(u.city || u.country) && (
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-subtle" />
                {[u.city, countryName(u.country, lang)].filter(Boolean).join(', ')}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Clock3 className="size-4 text-subtle" />
              {formatUtc(u.utcOffset)} · <span className="uppercase">{u.languages.join(' / ')}</span>
            </li>
            <li className="flex items-center gap-2">
              <BrandLogo name="GitHub" size={15} />
              {t('common.githubYears', { count: ghYears })}
            </li>
            {u.emailVerified && (
              <li className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-subtle" />
                {t('common.emailVerified')}
              </li>
            )}
            {u.availability.forMission && (
              <li className="flex items-center gap-2 text-success">
                <CheckCircle2 className="size-4" />
                {t('passport.mission')}
              </li>
            )}
            {p.countryRank && (
              <li className="flex items-center gap-2">
                <Award className="size-4 text-subtle" />
                <Link to="/classement" className="hover:text-accent-text hover:underline">
                  {t('passport.rank', { rank: p.countryRank, country: countryName(u.country, lang) })}
                </Link>
              </li>
            )}
          </ul>

          {(badges.length > 0 || u.isFounder) && (
            <section className="border-t border-line pt-4">
              <h2 className="text-[14px] font-semibold text-fg">Badges</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {u.isFounder && (
                  <span title={t('common.founder')} className="grid size-14 place-items-center rounded-full bg-canvas text-[#f0b232]">
                    <Star className="size-6" />
                  </span>
                )}
                {badges.map((c) => (
                  <Link key={c.id} to={`/certifications/${c.id}`} title={c.title}>
                    <CertBadge color={c.color} logo={c.logo} size={48} />
                  </Link>
                ))}
              </div>
            </section>
          )}
          {u.canHelpWith.length > 0 && (
            <section className="border-t border-line pt-4">
              <ChipList icon={<HandHelping />} label={t('passport.canHelp')} ids={u.canHelpWith} />
            </section>
          )}
          {u.wantsToLearn.length > 0 && (
            <section className="border-t border-line pt-4">
              <ChipList icon={<Sparkles />} label={t('passport.wantsToLearn')} ids={u.wantsToLearn} />
            </section>
          )}
        </aside>

        {/* -------- Contenu -------- */}
        <div className="min-w-0 flex-1">
          <nav aria-label="Sections du profil" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {(
              [
                ['overview', 'Aperçu', null],
                ['skills', 'Compétences', p.skills.length],
                ['projects', 'Projets', p.rooms.length],
                ['activity', 'Activité', proofs.length],
              ] as const
            ).map(([k, label, n]) => (
              <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined} className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors', tab === k ? 'bg-fg text-canvas' : 'bg-surface-1 text-fg hover:bg-surface-2')}>
                {label}
                {!!n && <span className={cn('rounded-full px-1.5 text-[11.5px] tabular', tab === k ? 'bg-canvas/20 text-canvas' : 'bg-canvas text-muted')}>{n}</span>}
              </button>
            ))}
          </nav>

          {tab === 'overview' && (
            <div className="mt-5 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
                <StatCard dark label="proof xp" value={formatNumber(p.totalXp, lang)} spark={sparkFrom(p.heatmap)} note={p.countryRank ? `#${p.countryRank} · ${countryName(u.country, lang)}` : undefined} />
                <StatCard label={t('passport.stats.unblocked')} value={p.stats.devsUnblocked} cube={CUBE.orange} note={`${p.stats.answersAccepted} réponses validées`} />
                <StatCard label={t('passport.stats.median')} value={p.stats.medianResponseMinutes !== null ? duration(p.stats.medianResponseMinutes, lang) : '—'} cube={CUBE.navy} note="avant la première réponse" />
                <StatCard label={t('passport.stats.contributions')} value={p.stats.contributions} cube={CUBE.green} note={`${p.rooms.length} projets`} />
              </div>

              {p.rooms.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[14px] font-medium text-fg">Projets épinglés</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {p.rooms.slice(0, 4).map((r) => (
                      <PinnedProject key={r.id} room={r} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="mb-2 text-[14px] font-medium text-fg">{t('passport.heatmap')}</h2>
                <div className="rounded-[20px] bg-surface-1 p-4">
                  <Heatmap days={p.heatmap} />
                </div>
              </section>

              <SkillsCard p={p} onProofs={setProofSkill} limit={5} />

              <section>
                <h2 className="mb-2 text-[14px] font-medium text-fg">{t('passport.timeline')}</h2>
                <div className="rounded-[20px] bg-surface-1 p-4">
                  {proofs.length === 0 ? <p className="text-sm text-muted">{t('passport.noTimeline')}</p> : <ProofTimeline proofs={proofs.slice(0, 6)} />}
                </div>
              </section>
            </div>
          )}

          {tab === 'skills' && (
            <div className="mt-5 flex flex-col gap-6">
              <SkillsCard p={p} onProofs={setProofSkill} />
              {isMe && p.skills[0] && (
                <section className="rounded-[20px] bg-surface-1 p-4">
                  <h2 className="text-[14px] font-medium text-fg">{t('passport.badge')}</h2>
                  <p className="text-[13px] text-muted">{t('passport.badgeHint')}</p>
                  <CodeBlock className="mt-3" lang="markdown" code={`[![DevHub · ${p.skills[0].tag.label} ${p.skills[0].score}](${location.origin}/badge/${u.handle}/${p.skills[0].tag.slug}.svg)](${location.origin}/u/${u.handle})`} />
                </section>
              )}
            </div>
          )}

          {tab === 'projects' && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {p.rooms.length === 0 ? <p className="text-sm text-muted">{t('passport.noRooms')}</p> : p.rooms.map((r) => <PinnedProject key={r.id} room={r} />)}
            </div>
          )}

          {tab === 'activity' && (
            <div className="mt-5 rounded-[20px] bg-surface-1 p-4">
              {proofs.length === 0 ? <p className="text-sm text-muted">{t('passport.noTimeline')}</p> : <ProofTimeline proofs={proofs} />}
            </div>
          )}

          <p className="mt-8 flex flex-wrap items-center gap-2 text-[12px] text-subtle">
            <CloudUpload className="size-3.5" />
            {status?.lastBackupAt && t('passport.savedAt', { time: relativeTime(status.lastBackupAt, lang) })}
            <span>·</span>
            {t('passport.memberSince', { date: formatDate(u.createdAt, lang, { month: 'long', year: 'numeric' }) })}
            <span>·</span>
            <Link to="/systalink" className="hover:text-fg hover:underline">
              Systalink
            </Link>
          </p>
        </div>
      </div>

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
        <p className="rounded-[10px] bg-surface-2 p-4 text-sm text-muted">{t('passport.contactSoon')}</p>
      </Sheet>
    </div>
  )
}

function SkillsCard({ p, onProofs, limit }: { p: PassportT; onProofs: (s: SkillView) => void; limit?: number }) {
  const { t } = useTranslation()
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-fg">{t('passport.skills')}</h2>
        <Link to="/regles" className="text-[12.5px] text-accent-text hover:underline">
          {t('passport.howScore')}
        </Link>
      </div>
      <div className="rounded-[20px] bg-surface-1 p-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-score-g" /> {t('passport.legendG')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-score-p" /> {t('passport.legendP')}
          </span>
        </div>
        {p.skills.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t('passport.noProofs')}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3.5">
            {p.skills.slice(0, limit ?? 20).map((s) => (
              <li key={s.tagId} className="grid grid-cols-[minmax(0,130px)_1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[150px_1fr_auto_auto]">
                <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-medium text-fg">
                  <BrandLogo name={s.tag.label} size={14} />
                  <span className="truncate">{s.tag.label}</span>
                </span>
                <ScoreBar g={s.githubSignal} p={Math.min(60, s.xpTag)} height={6} />
                <LevelBadge level={s.level} score={s.score} />
                <Button variant="ghost" size="xs" onClick={() => onProofs(s)} className="col-span-3 justify-self-start sm:col-span-1">
                  {t('passport.seeProofs')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Projet épinglé, façon dépôt épinglé sur GitHub. */
function PinnedProject({ room }: { room: PassportT['rooms'][number] }) {
  const { t } = useTranslation()
  return (
    <Link to={`/p/${room.inviteCode}`} className="flex flex-col gap-2 rounded-[20px] bg-surface-1 p-4 transition-colors ">
      <span className="flex items-center gap-2">
        <FolderGit2 className="size-4 text-subtle" />
        <span className="truncate text-[14px] font-medium text-accent-text">{room.name}</span>
        <span className="ml-auto rounded-full border border-line-strong px-2 text-[11px] text-muted">{t(`projects.state.${room.state}`)}</span>
      </span>
      <p className="line-clamp-2 text-[13px] text-muted">{room.tagline}</p>
      <span className="mt-auto flex flex-wrap items-center gap-3 text-[12px] text-subtle">
        {room.tags.slice(0, 3).map((tg) => (
          <span key={tg.id} className="inline-flex items-center gap-1.5">
            <BrandLogo name={tg.label} size={12} />
            {tg.label}
          </span>
        ))}
        <span className="ml-auto">{t('projects.openTasks', { count: room.openTasks })}</span>
      </span>
    </Link>
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
            <span className={cn('relative z-10 grid h-8 min-w-11 shrink-0 place-items-center rounded-[10px] px-1.5 text-[13px] font-semibold tabular', reverted ? 'bg-surface-3 text-subtle line-through' : e.kind === 'fast-bonus' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success')}>
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

/** Courbe d'entraide : cumul hebdomadaire sur 10 semaines, tiré du calendrier du profil. */
function sparkFrom(days: { count: number }[]) {
  let acc = 0
  return Array.from({ length: 10 }, (_, i) => (acc += days.slice(-70).slice(i * 7, i * 7 + 7).reduce((n, d) => n + d.count, 0) + 1))
}
