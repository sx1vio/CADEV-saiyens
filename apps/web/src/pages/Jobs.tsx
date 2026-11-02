import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Briefcase,
  CalendarClock,
  Check,
  ExternalLink,
  Globe,
  MapPin,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Markdown } from '@/components/ui/code';
import { useMedia } from '@/components/ui/overlay';
import { countryName } from '@/lib/geo';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import {
  CONTRACT_LABEL,
  MODE_LABEL,
  SENIORITY_LABEL,
  fetchJobs,
  hostOf,
  type JobOffer,
} from '@/platform/jobs';
import { LiveBoard } from '@/platform/LiveBoard';
import { BrandLogo, logoFor } from '@/platform/logos';
import { usePlatform } from '@/platform/store';
import { Ago, SERVICE_COLORS, ServiceHeader } from '@/platform/ui';

type Filter = 'remote' | 'cdi' | 'freelance' | 'stage' | 'junior' | 'saved';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'remote', label: 'Télétravail' },
  { id: 'cdi', label: 'CDI' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'stage', label: 'Stage et alternance' },
  { id: 'junior', label: 'Junior' },
  { id: 'saved', label: 'Enregistrées' },
];

const placeOf = (j: JobOffer) =>
  j.country && !j.location.toLowerCase().includes(countryName(j.country, 'fr').toLowerCase())
    ? `${j.location} · ${countryName(j.country, 'fr')}`
    : j.location;

/** Emplois : la sélection publiée par l'équipe DevHub, puis les offres collectées en direct. */
export default function Jobs() {
  const { id } = useParams();
  const nav = useNavigate();
  const wide = useMedia('(min-width: 1024px)');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const active = (params.get('filtres') ?? '').split(',').filter(Boolean) as Filter[];
  const saved = usePlatform((s) => s.savedJobs);
  const { data: jobs, error } = useQuery('jobs', fetchJobs);

  const list = useMemo(() => {
    const text = q.trim().toLowerCase();
    return (jobs ?? []).filter((j) => {
      const hay = [j.title, j.company, j.location, ...j.tags].join(' ').toLowerCase();
      if (text && !hay.includes(text)) return false;
      if (active.includes('remote') && j.workMode !== 'remote') return false;
      if (active.includes('cdi') && j.contract !== 'cdi') return false;
      if (active.includes('freelance') && j.contract !== 'freelance') return false;
      if (active.includes('stage') && j.contract !== 'stage' && j.contract !== 'alternance')
        return false;
      if (active.includes('junior') && j.seniority !== 'junior') return false;
      if (active.includes('saved') && !saved.includes(j.id)) return false;
      return true;
    });
  }, [jobs, q, active, saved]);

  const selected = (jobs ?? []).find((j) => j.id === id) ?? (wide ? list[0] : undefined);

  const toggleFilter = (f: Filter) => {
    const next = active.includes(f) ? active.filter((x) => x !== f) : [...active, f];
    const p = new URLSearchParams(params);
    if (next.length) p.set('filtres', next.join(','));
    else p.delete('filtres');
    setParams(p, { replace: true });
  };

  // Mobile : le détail occupe tout l'écran.
  if (!wide && id && selected) {
    return (
      <div className="dh-page px-4 py-4">
        <button
          type="button"
          onClick={() => nav('/emplois')}
          className="mb-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-semibold"
        >
          <ArrowLeft className="size-4" />
          Toutes les offres
        </button>
        <div className="rounded-[10px] bg-surface-1">
          <JobDetail job={selected} />
        </div>
      </div>
    );
  }

  return (
    <div className="dh-page mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={Briefcase}
        color={SERVICE_COLORS.jobs}
        title="Emplois"
        subtitle="Des offres réelles, chacune reliée à son annonce officielle : sélectionnées par l’équipe DevHub, ou collectées en direct chez les entreprises qui recrutent en Afrique et à distance."
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex h-12 items-center gap-2.5 rounded-full border border-line-strong bg-canvas px-4"
        >
          <Search className="size-4 shrink-0 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Poste, techno, entreprise ou ville"
            className="h-full w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-subtle"
            aria-label="Poste, techno, entreprise ou ville"
          />
        </form>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={active.includes(f.id)}
              onClick={() => toggleFilter(f.id)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors',
                active.includes(f.id) ? 'lg-tint' : 'lg-clear text-fg',
              )}
            >
              {active.includes(f.id) && <Check className="size-3.5" />}
              {f.label}
            </button>
          ))}
        </div>
      </ServiceHeader>

      <section aria-labelledby="selection" className="mt-6">
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2
            id="selection"
            className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-fg"
          >
            <ShieldCheck className="size-4 text-accent-text" aria-hidden />
            Sélection DevHub
          </h2>
          <span className="text-[12.5px] text-subtle">
            Offres vérifiées une à une par l’équipe, avec le lien vers l’annonce officielle
          </span>
        </div>
        {!jobs && !error && (
          <p className="rounded-[10px] bg-surface-1 p-5 text-muted">Chargement…</p>
        )}
        {!!error && !jobs && (
          <p className="rounded-[10px] bg-surface-1 p-5 text-muted">
            Impossible de charger les offres. Réessaie dans un instant.
          </p>
        )}
        {jobs && jobs.length === 0 && (
          <p className="rounded-[10px] bg-surface-1 p-5 text-muted">
            Pas encore d’offre sélectionnée cette semaine. Les offres collectées en direct sont
            juste en dessous.
          </p>
        )}
        {jobs && jobs.length > 0 && (
          <div className="flex gap-5">
            <ul className="flex w-full flex-col gap-2 lg:w-[440px] lg:shrink-0">
              {list.map((j) => (
                <li key={j.id}>
                  <JobRow job={j} active={wide && selected?.id === j.id} />
                </li>
              ))}
              {list.length === 0 && (
                <li className="rounded-[10px] bg-surface-1 p-8 text-center text-muted">
                  Aucune offre ne correspond. Retire un filtre.
                </li>
              )}
            </ul>
            {wide && selected && (
              <div className="sticky top-[72px] max-h-[calc(100dvh-88px)] min-w-0 flex-1 self-start overflow-y-auto rounded-[10px] bg-surface-1">
                <JobDetail job={selected} />
              </div>
            )}
          </div>
        )}
      </section>

      <LiveBoard kind="job" title="Offres en direct · dev en Afrique et à distance" />
    </div>
  );
}

function CompanyMark({ name, size }: { name: string; size: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[10px] bg-accent-soft font-bold text-accent-text"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

function JobRow({ job, active }: { job: JobOffer; active: boolean }) {
  const saved = usePlatform((s) => s.savedJobs.includes(job.id));
  const toggle = usePlatform((s) => s.toggle);
  return (
    <Link
      to={`/emplois/${job.id}`}
      className={cn(
        'group relative flex gap-3 rounded-[10px] border-2 p-4 transition-colors',
        active ? 'border-fg bg-surface-1' : 'border-transparent bg-surface-1 hover:bg-surface-2',
      )}
    >
      <CompanyMark name={job.company} size={48} />
      <div className="min-w-0 flex-1">
        <h3 className="pr-8 text-[14px] leading-snug font-semibold text-fg group-hover:underline">
          {job.title}
        </h3>
        <p className="mt-0.5 text-[13px] text-muted">{job.company}</p>
        <p className="text-[13px] text-subtle">
          {placeOf(job)} · {MODE_LABEL[job.workMode]}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-[6px] bg-surface-3 px-2 py-0.5 text-[12px] font-semibold text-fg">
            {CONTRACT_LABEL[job.contract]} · {SENIORITY_LABEL[job.seniority]}
          </span>
          {job.salary && (
            <span className="rounded-[6px] bg-success-soft px-2 py-0.5 text-[12px] font-semibold text-success">
              {job.salary}
            </span>
          )}
        </div>
        {job.tags.some((t) => logoFor(t)) && (
          <div className="mt-2 flex items-center gap-1.5">
            {job.tags
              .filter((t) => logoFor(t))
              .slice(0, 5)
              .map((t) => (
                <span
                  key={t}
                  title={t}
                  className="grid size-6 place-items-center rounded-[6px] bg-canvas"
                >
                  <BrandLogo name={t} size={13} />
                </span>
              ))}
          </div>
        )}
        <p className="mt-2 text-[12px] text-subtle">
          Publiée <Ago iso={job.publishedAt} />
        </p>
      </div>
      <button
        type="button"
        aria-label={saved ? 'Retirer des offres enregistrées' : 'Enregistrer l’offre'}
        aria-pressed={saved}
        onClick={(e) => {
          e.preventDefault();
          toggle('savedJobs', job.id);
        }}
        className={cn(
          'absolute top-3 right-3 grid size-8 place-items-center rounded-full hover:bg-surface-3',
          saved ? 'text-accent-text' : 'text-subtle',
        )}
      >
        <Bookmark className="size-[18px]" fill={saved ? 'currentColor' : 'none'} />
      </button>
    </Link>
  );
}

function JobDetail({ job }: { job: JobOffer }) {
  const saved = usePlatform((s) => s.savedJobs.includes(job.id));
  const toggle = usePlatform((s) => s.toggle);
  const expires = job.expiresAt
    ? new Date(job.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null;

  return (
    <article className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <CompanyMark name={job.company} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-muted">
            {job.companyUrl ? (
              <a
                href={job.companyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-accent-text"
              >
                {job.company}
                <Globe className="size-3.5" aria-hidden />
              </a>
            ) : (
              job.company
            )}
          </p>
          <h2 className="mt-0.5 text-[19px] leading-tight font-semibold text-fg">{job.title}</h2>
          <p className="mt-1 text-[13px] text-subtle">
            Publiée <Ago iso={job.publishedAt} />
            {expires && <> · jusqu’au {expires}</>}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1.5 font-semibold text-fg">
          <Briefcase className="size-4 text-subtle" />
          {CONTRACT_LABEL[job.contract]} · {SENIORITY_LABEL[job.seniority]}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1.5 font-semibold text-fg">
          <MapPin className="size-4 text-subtle" />
          {placeOf(job)} · {MODE_LABEL[job.workMode]}
        </span>
        {job.salary && (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-success-soft px-2.5 py-1.5 font-semibold text-success">
            <Wallet className="size-4" />
            {job.salary}
          </span>
        )}
        {expires && (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1.5 font-semibold text-fg">
            <CalendarClock className="size-4 text-subtle" />
            Expire le {expires}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-semibold text-white hover:bg-accent-hover"
        >
          Postuler
          <ArrowUpRight className="size-4" />
        </a>
        <button
          type="button"
          onClick={() => toggle('savedJobs', job.id)}
          aria-pressed={saved}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-[14px] font-semibold text-fg hover:bg-surface-3"
        >
          <Bookmark className="size-4" fill={saved ? 'currentColor' : 'none'} />
          {saved ? 'Enregistrée' : 'Enregistrer'}
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-subtle">
        La candidature se fait chez {hostOf(job.applyUrl)}. DevHub ne collecte aucune donnée de
        candidature.
      </p>

      {job.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {job.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1 text-[13px] font-medium text-fg"
            >
              {logoFor(t) && <BrandLogo name={t} size={14} />}
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-line pt-5 text-[14.5px] leading-relaxed text-fg">
        <Markdown>{job.description}</Markdown>
      </div>

      <a
        href={job.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex items-center gap-2 rounded-[10px] border border-line p-3 text-[13px] text-muted hover:border-line-strong hover:text-fg"
      >
        <ExternalLink className="size-4 shrink-0" />
        <span className="min-w-0">
          Annonce officielle : <span className="font-semibold">{hostOf(job.sourceUrl)}</span>
        </span>
      </a>
    </article>
  );
}
