import { ArrowLeft, Building2, ExternalLink, MapPin, ShieldCheck, Users } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Skeleton } from '@/components/ui/primitives';
import { countryName } from '@/lib/geo';
import { useQuery } from '@/lib/query';
import { CONTRACT_LABEL, MODE_LABEL, SENIORITY_LABEL, careers } from '@/platform/jobs';
import { Ago } from '@/platform/ui';
import NotFound from './NotFound';

/** Page publique d'une entreprise vérifiée et de ses offres ouvertes. */
export default function CompanyPage() {
  const { slug = '' } = useParams();
  const { data: c, error } = useQuery(`company:${slug}`, () => careers.company(slug));
  if (error && !c) return <NotFound />;
  if (!c)
    return (
      <div className="mx-auto max-w-[1000px] p-6">
        <Skeleton className="h-40 rounded-[12px]" />
      </div>
    );
  const initials = c.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div className="dh-page mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6">
      <Link
        to="/emplois"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Emplois
      </Link>
      <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-16 shrink-0 place-items-center rounded-[16px] bg-accent-soft text-[22px] font-bold text-accent-text">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg">
            {c.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-muted">
            <span className="inline-flex items-center gap-1 font-medium text-accent-text">
              <ShieldCheck className="size-4" /> Entreprise vérifiée par DevHub
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-4" /> {c.sector}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" /> {c.size} personnes
            </span>
            {(c.city || c.country) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {[c.city, c.country ? countryName(c.country, 'fr') : null]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            )}
          </p>
        </div>
        {c.website && (
          <a
            href={c.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-[14px] font-semibold text-fg hover:bg-surface-3"
          >
            Site web <ExternalLink className="size-4" />
          </a>
        )}
      </header>
      {c.about && (
        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed whitespace-pre-wrap text-fg">
          {c.about}
        </p>
      )}
      <h2 className="mt-10 text-[17px] font-semibold text-fg">Offres ouvertes ({c.jobs.length})</h2>
      {c.jobs.length === 0 ? (
        <p className="mt-3 rounded-[10px] bg-surface-1 p-6 text-muted">
          Pas d’offre ouverte en ce moment.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {c.jobs.map((j) => (
            <li key={j.id}>
              <Link
                to={`/emplois/${j.id}`}
                className="block h-full rounded-[10px] bg-surface-1 p-4 hover:bg-surface-2"
              >
                <p className="font-semibold text-fg">{j.title}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {j.location} · {MODE_LABEL[j.workMode]}
                </p>
                <p className="mt-2 text-[12.5px] text-subtle">
                  {CONTRACT_LABEL[j.contract]} · {SENIORITY_LABEL[j.seniority]} · publiée{' '}
                  <Ago iso={j.publishedAt} />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
