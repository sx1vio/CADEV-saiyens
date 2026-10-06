import { ArrowRight, BrainCircuit, CloudOff, FolderGit2, GitPullRequestArrow, LifeBuoy, Radio, ServerCog, ShieldCheck, Users } from 'lucide-react'
import { GitHubIcon } from '@/components/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import heroHub from '@/assets/hero-hub.webp'
import heroHubSm from '@/assets/hero-hub-sm.webp'
import { Djeli } from '@/components/djeli'
import { ActivityFeed, DemoBadge, errorText } from '@/components/domain'
import { Button, ButtonLink } from '@/components/ui/button'
import { ScoreBar } from '@/components/ui/data'
import { Avatar, Card, CardHeader, IconChip, Skeleton, StatusDot, TechTag } from '@/components/ui/primitives'
import { formatNumber, useLang } from '@/i18n'
import { countryName } from '@/lib/geo'
import { invalidate, useQuery } from '@/lib/query'
import { useNetwork } from '@/offline/network'
import { api } from '@/services'
import { useSession, useUI } from '@/stores/app'

/** Page publique « en direct » (T1) : comprise en 20 secondes, essai sans compte (T2). */
export default function Landing() {
  const { t } = useTranslation()
  const lang = useLang()
  const nav = useNavigate()
  const setUser = useSession((s) => s.setUser)
  const setSim = useNetwork((s) => s.setSim)
  const setSync = useUI((s) => s.setSync)
  const [busy, setBusy] = useState(false)
  const { data } = useQuery('landing', () => api.getLanding())
  const { data: devs } = useQuery('devs:presence', () => api.discoverDevs({}))

  const tryDemo = async () => {
    setBusy(true)
    try {
      const u = await api.loginDemo('awa-kone')
      setUser(u)
      invalidate('')
      nav('/')
    } catch (e) {
      toast.error(errorText(t, e))
    } finally {
      setBusy(false)
    }
  }

  const s = data?.stats
  const stats = [
    { value: s ? formatNumber(s.devs, lang) : null, label: t('landing.statDevs') },
    { value: s ? formatNumber(s.questionsResolved, lang) : null, label: t('landing.statResolved') },
    { value: s ? (s.medianFirstResponseMinutes !== null ? t('landing.minutes', { count: s.medianFirstResponseMinutes }) : '—') : null, label: t('landing.statMedian') },
    { value: s ? formatNumber(s.countries, lang) : null, label: t('landing.statCountries') },
  ]

  return (
    <div className="dh-page mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-5 pb-16 sm:px-6 sm:pt-8">
      {/* -------- Hero (image 01) -------- */}
      <section className="relative overflow-hidden rounded-[28px] bg-hero px-6 pt-8 pb-9 text-on-hero shadow-accent sm:px-10 sm:pt-12 sm:pb-14 lg:min-h-[440px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
        <img
          src={heroHub}
          srcSet={`${heroHubSm} 360w, ${heroHub} 600w`}
          sizes="(max-width: 640px) 360px, 600px"
          alt=""
          width={600}
          height={573}
          fetchPriority="low"
          className="pointer-events-none absolute -right-24 -bottom-24 w-[420px] max-w-none opacity-60 sm:-right-10 sm:-bottom-20 sm:w-[520px] sm:opacity-90 lg:top-1/2 lg:right-0 lg:bottom-auto lg:w-[560px] lg:-translate-y-1/2 lg:opacity-100"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,var(--accent-strong)_0%,color-mix(in_oklab,var(--accent-strong),transparent_35%)_45%,transparent_75%)] sm:block" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-on-hero/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Radio className="size-3.5" />
            {t('landing.live')} · {t('app.slogan')}
          </span>
          <h1 className="mt-5 text-[34px] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-[48px] lg:text-[54px]">{t('landing.heroTitle')}</h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-on-hero-muted sm:text-[17px]">{t('landing.heroSubtitle')}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="contrast" size="lg" loading={busy} onClick={tryDemo} className="sm:min-w-52">
              {t('landing.tryNow')}
              <ArrowRight />
            </Button>
            <ButtonLink to="/connexion" size="lg" className="border border-on-hero/30 bg-on-hero/10 text-on-hero backdrop-blur hover:bg-on-hero/20" icon={<GitHubIcon />}>
              {t('landing.github')}
            </ButtonLink>
          </div>
          <p className="mt-3 text-xs text-on-hero-muted">{t('landing.tryHint')}</p>
          {devs && devs.length > 0 && (
            <Link to="/decouvrir" className="mt-7 inline-flex items-center gap-3 rounded-full bg-on-hero/12 py-1.5 pr-4 pl-1.5 text-[13px] font-medium text-on-hero backdrop-blur-md transition-colors hover:bg-on-hero/20">
              <span className="flex -space-x-2.5">
                {devs.slice(0, 6).map((d) => (
                  <Avatar key={d.id} name={d.displayName} src={d.avatarUrl} size={32} className="ring-2 ring-[color-mix(in_oklab,var(--accent-strong),white_10%)]" />
                ))}
              </span>
              {t('landing.community', { devs: devs.length, countries: new Set(devs.map((d) => d.country)).size })}
            </Link>
          )}
        </div>
        <Djeli pose="wave" size={132} float className="absolute right-6 bottom-4 hidden sm:inline-grid lg:right-[300px] lg:bottom-8" />
      </section>

      {/* -------- Chiffres (image 02 : grands chiffres) -------- */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((st) => (
          <Card key={st.label} className="p-4 sm:p-5">
            {st.value === null ? <Skeleton className="h-8 w-20" /> : <div className="text-[26px] font-semibold leading-none tracking-tight tabular text-fg sm:text-[32px]">{st.value}</div>}
            <p className="mt-2 text-[13px] text-muted">{st.label}</p>
          </Card>
        ))}
      </section>
      {s?.source === 'local' && (
        <p className="-mt-2 flex items-center gap-2 text-xs text-subtle">
          <DemoBadge /> {t('common.demoDataHint')}
        </p>
      )}

      {/* -------- Bento -------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2 lg:row-span-2">
          <CardHeader
            icon={<StatusDot tone="success" pulse />}
            title={t('landing.liveTitle')}
            action={
              <ButtonLink to="/sos" variant="pill" size="xs">
                {t('common.seeAll')}
              </ButtonLink>
            }
          />
          <div className="mt-5">{data ? <ActivityFeed items={data.live} /> : <Skeleton className="h-72 rounded-[14px]" />}</div>
        </Card>

        {[
          { icon: <LifeBuoy />, tone: 'accent' as const, title: t('landing.help'), text: t('landing.helpText'), to: '/sos' },
          { icon: <FolderGit2 />, tone: 'blue' as const, title: t('landing.build'), text: t('landing.buildText'), to: '/projets' },
        ].map((p) => (
          <Link key={p.to} to={p.to} className="group surface-card flex flex-col gap-3 p-5 transition-colors hover:border-line-strong sm:p-6">
            <IconChip tone={p.tone}>{p.icon}</IconChip>
            <h2 className="text-lg font-semibold tracking-tight text-fg">{p.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{p.text}</p>
            <ArrowRight className="mt-auto size-4 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-fg" />
          </Link>
        ))}
      </section>

      {/* -------- Passports (Prouver) -------- */}
      <section className="glow-border relative overflow-hidden rounded-[24px] bg-surface-1 p-5 sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[var(--gradient-glow)]" />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <IconChip tone="success">
              <ShieldCheck />
            </IconChip>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-fg">{t('landing.featuredTitle')}</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">{t('landing.proveText')}</p>
          </div>
          <ButtonLink to="/decouvrir" variant="pill" size="sm" className="mt-3 self-start sm:mt-0 sm:self-auto">
            {t('nav.discover')}
          </ButtonLink>
        </div>
        <div className="relative mt-6 grid gap-3 md:grid-cols-3">
          {(data?.featured ?? []).map((p) => (
            <Link key={p.user.id} to={`/u/${p.user.handle}`} className="group flex flex-col gap-4 rounded-[18px] border border-line bg-surface-2 p-4 transition-colors hover:border-line-strong">
              <div className="flex items-center gap-3">
                <Avatar name={p.user.displayName} src={p.user.avatarUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-fg">{p.user.displayName}</p>
                    {p.user.isDemo && <DemoBadge />}
                  </div>
                  <p className="truncate text-xs text-subtle">
                    {p.user.city}, {countryName(p.user.country, lang)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular text-fg">{p.totalXp}</p>
                  <p className="text-[10.5px] text-subtle">XP</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {p.skills.slice(0, 3).map((sk) => (
                  <div key={sk.tagId} className="flex items-center gap-2.5">
                    <span className="w-20 truncate font-mono text-[11.5px] text-muted">{sk.tag.label}</span>
                    <ScoreBar g={sk.githubSignal} p={Math.min(60, sk.xpTag)} height={6} className="flex-1" />
                    <span className="w-6 text-right text-xs font-semibold tabular text-fg">{sk.score}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                <span className="font-semibold text-fg">{p.stats.devsUnblocked}</span> {t('passport.stats.unblocked')} ·{' '}
                <span className="font-semibold text-fg">{p.stats.contributions}</span> {t('passport.stats.contributions')}
              </p>
            </Link>
          ))}
          {!data && [0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-[18px]" />)}
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-score-g" /> {t('passport.legendG')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-score-p" /> {t('passport.legendP')}
          </span>
        </div>
      </section>

      {/* -------- Pourquoi DevHub à l'heure de l'IA -------- */}
      <section className="flex flex-col gap-4">
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{t('landing.whyTitle')}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: <BrainCircuit />, title: t('landing.why1'), text: t('landing.why1Text') },
            { icon: <GitPullRequestArrow />, title: t('landing.why2'), text: t('landing.why2Text') },
            { icon: <Users />, title: t('landing.why3'), text: t('landing.why3Text') },
          ].map((w) => (
            <Card key={w.title} className="p-5">
              <IconChip tone="neutral">{w.icon}</IconChip>
              <h3 className="mt-3 font-semibold text-fg">{w.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{w.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* -------- Hors ligne + Systalink -------- */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-center gap-4 overflow-hidden p-5 sm:p-6">
          <div className="min-w-0 flex-1">
            <IconChip tone="warning">
              <CloudOff />
            </IconChip>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-fg">{t('landing.offlineTitle')}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{t('landing.offlineText')}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSim('offline')
                setSync(true)
              }}
            >
              {t('landing.offlineCta')}
            </Button>
          </div>
          <Djeli pose="laptop" size={110} className="hidden sm:inline-grid" />
        </Card>
        <Card className="p-5 sm:p-6">
          <IconChip tone="blue">
            <ServerCog />
          </IconChip>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-fg">{t('landing.systalinkTitle')}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{t('landing.systalinkText')}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['VPS', 'PostgreSQL', 'Backup', 'Mail'].map((x) => (
              <TechTag key={x} label={x} />
            ))}
          </div>
          <ButtonLink to="/systalink" variant="secondary" size="sm" className="mt-4">
            {t('landing.systalinkCta')}
          </ButtonLink>
        </Card>
      </section>

      {/* -------- Appel final -------- */}
      <section className="flex flex-col items-center gap-4 rounded-[24px] border border-line bg-surface-1 px-6 py-10 text-center">
        <Djeli pose="celebrate" size={96} />
        <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-fg">{t('app.pitch')}</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="hero" size="lg" loading={busy} onClick={tryDemo}>
            {t('landing.tryNow')}
          </Button>
          <ButtonLink to="/connexion" variant="secondary" size="lg" icon={<GitHubIcon />}>
            {t('landing.github')}
          </ButtonLink>
        </div>
      </section>
    </div>
  )
}
