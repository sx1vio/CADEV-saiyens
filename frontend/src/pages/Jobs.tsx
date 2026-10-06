import { ArrowLeft, BadgeCheck, Bookmark, Briefcase, Building2, Check, Clock, MapPin, Search, Send, ShieldCheck, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button, ButtonLink } from '@/components/ui/button'
import { Sheet, useMedia } from '@/components/ui/overlay'
import { Avatar, Textarea } from '@/components/ui/primitives'
import { countryName } from '@/lib/geo'
import { useQuery } from '@/lib/query'
import { cn } from '@/lib/utils'
import { api } from '@/services'
import { useSession } from '@/stores/app'
import { CONTRACT_LABEL, JOBS, MODE_LABEL, SENIORITY_LABEL } from '@/platform/data/jobs'
import { PLATFORM_CERTS } from '@/platform/data/certs'
import { usePlatform } from '@/platform/store'
import type { Job } from '@/platform/types'
import { Ago, CompanyLogo, DemoTag, SERVICE_COLORS, ServiceHeader, companyOf } from '@/platform/ui'
import { BrandLogo, TechChip, logoFor } from '@/platform/logos'

type Filter = 'remote' | 'cdi' | 'freelance' | 'stage' | 'junior' | 'saved'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'remote', label: 'Télétravail' },
  { id: 'cdi', label: 'CDI' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'stage', label: 'Stage et alternance' },
  { id: 'junior', label: 'Junior' },
  { id: 'saved', label: 'Enregistrées' },
]

export function salaryText(j: Job) {
  if (!j.salary) return null
  const f = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
  const range = j.salary.min === j.salary.max ? f(j.salary.min) : `${f(j.salary.min)} – ${f(j.salary.max)}`
  return `${range} ${j.salary.currency} / ${j.salary.period}`
}

/** Espace Emplois : recherche, liste et détail côte à côte. */
export default function Jobs() {
  const { id } = useParams()
  const nav = useNavigate()
  const wide = useMedia('(min-width: 1024px)')
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [where, setWhere] = useState('')
  const active = (params.get('filtres') ?? '').split(',').filter(Boolean) as Filter[]
  const saved = usePlatform((s) => s.savedJobs)
  const mine = usePlatform((s) => s.publishedJobs)
  const all = useMemo(() => [...mine, ...JOBS], [mine])

  const list = useMemo(() => {
    const text = q.trim().toLowerCase()
    const place = where.trim().toLowerCase()
    return all.filter((j) => {
      const c = companyOf(j.company)
      if (text && ![j.title, c.name, ...j.stack].join(' ').toLowerCase().includes(text)) return false
      if (place && ![j.city, countryName(j.country, 'fr')].join(' ').toLowerCase().includes(place)) return false
      if (active.includes('remote') && j.mode !== 'remote') return false
      if (active.includes('cdi') && j.contract !== 'cdi') return false
      if (active.includes('freelance') && j.contract !== 'freelance') return false
      if (active.includes('stage') && j.contract !== 'stage' && j.contract !== 'alternance') return false
      if (active.includes('junior') && j.seniority !== 'junior') return false
      if (active.includes('saved') && !saved.includes(j.id)) return false
      return true
    })
  }, [all, q, where, active, saved])

  const selected = all.find((j) => j.id === id) ?? (wide ? list[0] : undefined)

  const toggleFilter = (f: Filter) => {
    const next = active.includes(f) ? active.filter((x) => x !== f) : [...active, f]
    const p = new URLSearchParams(params)
    if (next.length) p.set('filtres', next.join(','))
    else p.delete('filtres')
    setParams(p, { replace: true })
  }

  // Mobile : le détail occupe tout l'écran.
  if (!wide && id && selected) {
    return (
      <div className="dh-page px-4 py-4">
        <button type="button" onClick={() => nav('/emplois')} className="mb-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-semibold">
          <ArrowLeft className="size-4" />
          Toutes les offres
        </button>
        <JobDetail job={selected} />
      </div>
    )
  }

  return (
    <div className="dh-page mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={Briefcase}
        color={SERVICE_COLORS.jobs}
        title="Emplois"
        subtitle="Des offres pour les devs, avec des compétences prouvées plutôt que des CV déclaratifs."
        actions={
          <ButtonLink to="/emplois/publier" variant="secondary" icon={<Building2 />}>
            Publier une offre
          </ButtonLink>
        }
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col overflow-hidden rounded-[22px] border border-line-strong bg-canvas sm:flex-row sm:rounded-full"
        >
          <label className="flex flex-1 items-center gap-2.5 px-4">
            <Search className="size-4 shrink-0 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Poste, techno ou entreprise" className="h-12 w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-subtle" aria-label="Poste, techno ou entreprise" />
          </label>
          <label className="flex flex-1 items-center gap-2.5 border-t border-line px-4 sm:border-t-0 sm:border-l">
            <MapPin className="size-4 shrink-0 text-subtle" />
            <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Ville ou pays" className="h-12 w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-subtle" aria-label="Ville ou pays" />
          </label>
        </form>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={active.includes(f.id)} onClick={() => toggleFilter(f.id)} className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors', active.includes(f.id) ? 'bg-fg text-canvas' : 'bg-surface-1 text-fg hover:bg-surface-2')}>
              {active.includes(f.id) && <Check className="size-3.5" />}
              {f.label}
            </button>
          ))}
        </div>
      </ServiceHeader>

      <p className="mt-5 mb-2 text-[13px] text-subtle">{list.length} offre{list.length > 1 ? 's' : ''}</p>
      <div className="flex gap-5">
        <ul className="flex w-full flex-col gap-2 lg:w-[440px] lg:shrink-0">
          {list.map((j) => (
            <li key={j.id}>
              <JobRow job={j} active={selected?.id === j.id} />
            </li>
          ))}
          {list.length === 0 && <li className="rounded-[20px] bg-surface-1 p-8 text-center text-muted">Aucune offre ne correspond. Retire un filtre.</li>}
        </ul>
        {wide && selected && (
          <div className="sticky top-[72px] max-h-[calc(100dvh-88px)] min-w-0 flex-1 self-start overflow-y-auto rounded-[20px] bg-surface-1">
            <JobDetail job={selected} />
          </div>
        )}
      </div>
    </div>
  )
}

function JobRow({ job, active }: { job: Job; active: boolean }) {
  const c = companyOf(job.company)
  const saved = usePlatform((s) => s.savedJobs.includes(job.id))
  const applied = usePlatform((s) => s.applications.some((a) => a.jobId === job.id))
  const toggle = usePlatform((s) => s.toggle)
  return (
    <Link to={`/emplois/${job.id}`} className={cn('group relative flex gap-3 rounded-[20px] border-2 p-4 transition-colors', active ? 'border-fg bg-surface-1' : 'border-transparent bg-surface-1 hover:bg-surface-2')}>
      <CompanyLogo slug={job.company} size={48} />
      <div className="min-w-0 flex-1">
        <h3 className="pr-8 text-[14px] leading-snug font-semibold text-fg group-hover:underline">{job.title}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
          {c.name}
          {c.verified && <BadgeCheck className="size-3.5 text-accent-text" />}
        </p>
        <p className="text-[13px] text-subtle">
          {job.city}, {countryName(job.country, 'fr')} · {MODE_LABEL[job.mode]}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-[6px] bg-surface-3 px-2 py-0.5 text-[12px] font-semibold text-fg">{CONTRACT_LABEL[job.contract]}</span>
          {salaryText(job) && <span className="rounded-[6px] bg-success-soft px-2 py-0.5 text-[12px] font-semibold text-success">{salaryText(job)}</span>}
          {job.provenSkills && <span className="inline-flex items-center gap-1 rounded-[6px] bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent-text"><ShieldCheck className="size-3" />Compétences prouvées</span>}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {job.stack.filter((t) => logoFor(t)).slice(0, 5).map((t) => (
            <span key={t} title={t} className="grid size-6 place-items-center rounded-[6px] bg-canvas">
              <BrandLogo name={t} size={13} />
            </span>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-subtle">
          {applied ? <span className="font-semibold text-success">Candidature envoyée</span> : <Ago iso={job.postedAt} />}
          <span>·</span>
          {job.applicants} candidat{job.applicants > 1 ? 's' : ''}
          {!job.id.startsWith('mine-') && <DemoTag className="ml-1" />}
        </p>
      </div>
      <button
        type="button"
        aria-label={saved ? 'Retirer des offres enregistrées' : 'Enregistrer l’offre'}
        aria-pressed={saved}
        onClick={(e) => {
          e.preventDefault()
          toggle('savedJobs', job.id)
        }}
        className={cn('absolute top-3 right-3 grid size-8 place-items-center rounded-full hover:bg-surface-3', saved ? 'text-accent-text' : 'text-subtle')}
      >
        <Bookmark className="size-[18px]" fill={saved ? 'currentColor' : 'none'} />
      </button>
    </Link>
  )
}

function JobDetail({ job }: { job: Job }) {
  const me = useSession((s) => s.user)
  const c = companyOf(job.company)
  const saved = usePlatform((s) => s.savedJobs.includes(job.id))
  const application = usePlatform((s) => s.applications.find((a) => a.jobId === job.id))
  const toggle = usePlatform((s) => s.toggle)
  const certResults = usePlatform((s) => s.certResults)
  const [applyOpen, setApplyOpen] = useState(false)
  const { data: passport } = useQuery(me ? `passport:${me.handle}` : null, () => api.getPassport(me!.handle))
  const scoreOf = (tag: string) => passport?.skills.find((s) => s.tag.label.toLowerCase() === tag.toLowerCase())?.score ?? 0
  const badges = PLATFORM_CERTS.filter((x) => certResults[x.id]?.passed)

  return (
    <article className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <CompanyLogo slug={job.company} size={56} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[14px] font-semibold text-muted">
            {c.name}
            {c.verified && <BadgeCheck className="size-4 text-accent-text" aria-label="Entreprise vérifiée" />}
          </p>
          <h2 className="mt-0.5 text-[19px] leading-tight font-semibold text-fg">{job.title}</h2>
          <p className="mt-1 text-[13px] text-subtle">
            {job.city}, {countryName(job.country, 'fr')} · <Ago iso={job.postedAt} /> · {job.applicants} candidats
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1.5 font-semibold text-fg"><Briefcase className="size-4 text-subtle" />{CONTRACT_LABEL[job.contract]} · {SENIORITY_LABEL[job.seniority]}</span>
        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1.5 font-semibold text-fg"><MapPin className="size-4 text-subtle" />{MODE_LABEL[job.mode]}</span>
        {salaryText(job) && <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-success-soft px-2.5 py-1.5 font-semibold text-success"><Wallet className="size-4" />{salaryText(job)}</span>}
        {job.closesAt && <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1.5 font-semibold text-fg"><Clock className="size-4 text-subtle" />Clôture {new Date(job.closesAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {application ? (
          <Button variant="success" icon={<Check />} disabled>
            Candidature envoyée
          </Button>
        ) : me ? (
          <Button variant="primary" icon={<Send />} onClick={() => setApplyOpen(true)}>
            Postuler avec mon profil
          </Button>
        ) : (
          <ButtonLink to="/connexion" variant="primary">
            Se connecter pour postuler
          </ButtonLink>
        )}
        <Button variant="secondary" icon={<Bookmark fill={saved ? 'currentColor' : 'none'} />} onClick={() => toggle('savedJobs', job.id)}>
          {saved ? 'Enregistrée' : 'Enregistrer'}
        </Button>
      </div>

      <p className="mt-6 text-[14px] leading-relaxed text-fg">{job.summary}</p>

      {(job.provenSkills || job.certs) && (
        <section className="mt-6 rounded-[12px] bg-canvas p-4">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-fg">
            <ShieldCheck className="size-4 text-accent-text" />
            Ce que l’entreprise veut voir prouvé
          </h3>
          <ul className="mt-3 flex flex-col gap-3">
            {job.provenSkills?.map((s) => {
              const mineScore = scoreOf(s.tag)
              const ok = mineScore >= s.min
              return (
                <li key={s.tag}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-fg">{s.tag}</span>
                    <span className={cn('font-semibold tabular', ok ? 'text-success' : 'text-muted')}>
                      {me ? `ton score ${mineScore}/100 · ` : ''}demandé {s.min}
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-surface-3">
                    <div className={cn('h-full rounded-full', ok ? 'bg-success' : 'bg-accent')} style={{ width: `${Math.min(100, mineScore)}%` }} />
                    <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-fg" style={{ left: `${s.min}%` }} aria-hidden />
                  </div>
                </li>
              )
            })}
            {job.certs?.map((cert) => (
              <li key={cert} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="text-muted">Certification appréciée : <b className="text-fg">{cert}</b></span>
                <Link to="/certifications?vue=base" className="shrink-0 font-semibold text-accent-text hover:underline">Voir la fiche</Link>
              </li>
            ))}
          </ul>
          {me && job.provenSkills?.some((s) => scoreOf(s.tag) < s.min) && (
            <p className="mt-3 text-[13px] text-muted">
              Pas encore au niveau ? Aide sur <Link to="/sos" className="font-semibold text-accent-text hover:underline">l’entraide</Link> pour gagner des Proof XP, ou passe une{' '}
              <Link to="/certifications" className="font-semibold text-accent-text hover:underline">certification gratuite</Link>.
            </p>
          )}
        </section>
      )}

      <Block title="Tes missions" items={job.missions} />
      <Block title="Profil recherché" items={job.profile} />
      <Block title="Avantages" items={job.perks} />

      <section className="mt-6">
        <h3 className="text-[14px] font-semibold text-fg">Stack</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.stack.map((s) => (
            <TechChip key={s} label={s} />
          ))}
        </div>
      </section>

      <section className="mt-6 flex gap-3 rounded-[12px] border border-line p-4">
        <CompanyLogo slug={job.company} size={44} />
        <div>
          <h3 className="text-[14px] font-semibold text-fg">À propos de {c.name}</h3>
          <p className="text-[13px] text-subtle">
            {c.sector} · {c.size} personnes · {c.city}
          </p>
          <p className="mt-1.5 text-[14px] text-muted">{c.about}</p>
          <p className="mt-2 text-[12px] text-subtle">Entreprise fictive de démonstration.</p>
        </div>
      </section>

      <Sheet open={applyOpen} onOpenChange={setApplyOpen} title={`Postuler · ${job.title}`} description="L’entreprise reçoit ton profil DevHub : compétences prouvées, projets, certifications. Ton e-mail reste privé.">
        <ApplyForm job={job} badges={badges.map((b) => b.title)} onDone={() => setApplyOpen(false)} />
      </Sheet>
    </article>
  )
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h3 className="text-[14px] font-semibold text-fg">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((m) => (
          <li key={m} className="flex gap-2 text-[13.5px] text-muted">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            {m}
          </li>
        ))}
      </ul>
    </section>
  )
}

function ApplyForm({ job, badges, onDone }: { job: Job; badges: string[]; onDone: () => void }) {
  const me = useSession((s) => s.user)!
  const apply = usePlatform((s) => s.apply)
  const [msg, setMsg] = useState(`Bonjour, votre offre « ${job.title} » m’intéresse. `)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[10px] bg-surface-2 p-3">
        <Avatar name={me.displayName} src={me.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{me.displayName}</p>
          <p className="text-[12.5px] text-subtle">devhub.africa/u/{me.handle}</p>
        </div>
        <Users className="size-4 text-subtle" />
      </div>
      {badges.length > 0 && (
        <p className="text-[13px] text-muted">
          Badges joints : <b className="text-fg">{badges.join(', ')}</b>
        </p>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg">Message à l’entreprise</span>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="min-h-32" />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
        <Button
          variant="primary"
          icon={<Send />}
          disabled={msg.trim().length < 20}
          onClick={() => {
            apply(job.id, msg.trim())
            toast.success('Candidature envoyée', { description: `${companyOf(job.company).name} a reçu ton profil.` })
            onDone()
          }}
        >
          Envoyer ma candidature
        </Button>
      </div>
    </div>
  )
}
