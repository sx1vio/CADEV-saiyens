import type { BusinessJobView, BusinessMeView, RecentApplicationView } from '@devhub/contracts';
import { ArrowRight, ExternalLink, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SITE_URL, api } from '../api';
import { StatusBanner } from '../App';

const STATUS: Record<RecentApplicationView['status'], { label: string; tone: string }> = {
  submitted: { label: 'Nouvelle', tone: 'bg-brand-soft text-brand' },
  seen: { label: 'Consultée', tone: 'bg-page text-muted ring-1 ring-line' },
  interview: { label: 'Entretien', tone: 'bg-warn-soft text-warn' },
  hired: { label: 'Recrutée', tone: 'bg-good-soft text-good' },
  rejected: { label: 'Non retenue', tone: 'bg-page text-muted ring-1 ring-line' },
  withdrawn: { label: 'Retirée', tone: 'bg-page text-muted ring-1 ring-line' },
};

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'aujourd’hui' : d === 1 ? 'hier' : `il y a ${d} j`;
};

export function Dashboard({ me, onError }: { me: BusinessMeView; onError: (e: unknown) => void }) {
  const [jobs, setJobs] = useState<BusinessJobView[] | null>(null);
  const [recent, setRecent] = useState<RecentApplicationView[] | null>(null);
  useEffect(() => {
    api.jobs().then((r) => setJobs(r.data), onError);
    api.recentApplications(6).then((r) => setRecent(r.data), onError);
  }, [onError]);
  const live = jobs?.filter((j) => j.status === 'published').length ?? 0;
  const apps = jobs?.reduce((n, j) => n + j.applications, 0) ?? 0;
  const fresh = jobs?.reduce((n, j) => n + j.newApplications, 0) ?? 0;
  return (
    <section>
      <h1 className="text-[22px] font-bold">Bonjour {me.account.name.split(' ')[0]}</h1>
      <p className="mt-1 mb-6 text-[14px] text-muted">Voici où en sont vos recrutements.</p>
      <StatusBanner me={me} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Offres en ligne', live],
          ['Brouillons', jobs?.filter((j) => j.status === 'draft').length ?? 0],
          ['Candidatures', apps],
          ['À lire', fresh],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-xl border border-line bg-panel p-4">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="mt-1 text-[26px] font-bold tabular-nums">{jobs ? n : '…'}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href="#offres/nouvelle" className="btn-primary">
          <Plus className="size-4" />
          Publier une offre
        </a>
        {me.company.status === 'verified' && (
          <a
            href={`${SITE_URL}/entreprises/${me.company.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            Voir notre page publique
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-panel p-5">
        <h2 className="text-[16px] font-semibold">Dernières candidatures</h2>
        {recent === null ? (
          <p className="mt-3 text-[14px] text-muted">Chargement…</p>
        ) : recent.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">
            Aucune candidature pour l’instant. Les devs postulent avec leur Passport dès qu’une
            offre est en ligne.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((a) => (
              <li key={a.id}>
                <a
                  href={`#offres/${a.jobId}`}
                  className="flex items-center gap-3 py-3 hover:bg-page sm:-mx-2 sm:rounded-lg sm:px-2"
                >
                  {a.candidate.avatarUrl ? (
                    <img
                      src={a.candidate.avatarUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand">
                      {a.candidate.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.candidate.displayName}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {a.jobTitle} · {ago(a.createdAt)}
                      {a.candidate.skills[0] &&
                        ` · ${a.candidate.skills
                          .slice(0, 3)
                          .map((s) => s.label)
                          .join(', ')}`}
                    </span>
                  </span>
                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold sm:inline ${STATUS[a.status].tone}`}
                  >
                    {STATUS[a.status].label}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
