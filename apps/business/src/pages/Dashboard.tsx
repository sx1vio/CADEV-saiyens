import type { BusinessJobView, BusinessMeView } from '@devhub/contracts';
import { ExternalLink, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SITE_URL, api } from '../api';
import { StatusBanner } from '../App';

export function Dashboard({ me, onError }: { me: BusinessMeView; onError: (e: unknown) => void }) {
  const [jobs, setJobs] = useState<BusinessJobView[] | null>(null);
  useEffect(() => {
    api.jobs().then((r) => setJobs(r.data), onError);
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
    </section>
  );
}
