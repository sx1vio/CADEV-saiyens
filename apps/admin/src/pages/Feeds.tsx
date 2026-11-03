import type { AdminFeedJob, AdminFeedsView } from '@devhub/contracts';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { Badge, PageHeader, ago, when } from '../ui/kit';

const JOBS: { id: AdminFeedJob; label: string; hint: string }[] = [
  {
    id: 'news',
    label: 'Actualités et vidéos',
    hint: 'RSS, YouTube, Hacker News, DEV · toutes les 15 min',
  },
  { id: 'github', label: 'GitHub', hint: 'Dépôts et versions · toutes les heures' },
  { id: 'jobs', label: 'Offres à distance', hint: 'Remotive, Jobicy · toutes les 6 h' },
  { id: 'certs', label: 'Certifications', hint: 'Microsoft Learn · une fois par jour' },
  { id: 'skills', label: 'Skills et plugins IA', hint: 'Anthropic, OpenAI, MCP · toutes les 6 h' },
];

/** Collecte automatique des contenus externes : volumes, derniers passages, erreurs, relance. */
export function Feeds({ onError }: { onError: (e: unknown) => void }) {
  const [data, setData] = useState<AdminFeedsView | null>(null);
  const [sent, setSent] = useState<AdminFeedJob | null>(null);
  const load = useCallback(() => api.feeds().then(setData, onError), [onError]);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (job: AdminFeedJob) => {
    try {
      await api.runFeed(job);
      setSent(job);
      setTimeout(load, 8000);
    } catch (e) {
      onError(e);
      alert(errorMessage(e));
    }
  };

  return (
    <section>
      <PageHeader title="Flux">
        Les contenus externes (actualités, vidéos, offres, certifications, outils IA) sont collectés
        par le worker. Relance une collecte si une source a changé ou après une panne.
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {JOBS.map((j) => (
          <div key={j.id} className="flex flex-col rounded-xl border border-line bg-panel p-4">
            <p className="font-semibold">{j.label}</p>
            <p className="text-[13px] text-muted">{j.hint}</p>
            <button
              type="button"
              className="btn-ghost mt-3 h-9 self-start"
              onClick={() => run(j.id)}
            >
              <RefreshCw className="size-4" /> {sent === j.id ? 'Demandée' : 'Relancer'}
            </button>
          </div>
        ))}
      </div>
      {data && (
        <>
          <h2 className="mt-8 mb-3 text-[17px] font-semibold">Contenus collectés</h2>
          <div className="flex flex-wrap gap-2">
            {data.counts.map((c) => (
              <span
                key={c.kind}
                className="rounded-lg bg-panel px-3 py-2 text-[14px] ring-1 ring-line"
              >
                <strong className="tabular-nums">{c.items}</strong> {c.kind}
                {c.last && <span className="text-muted"> · dernier {ago(c.last)}</span>}
              </span>
            ))}
          </div>
          <h2 className="mt-8 mb-3 text-[17px] font-semibold">Derniers passages</h2>
          <ul className="flex flex-col gap-2">
            {data.runs.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-panel p-3 text-[14px]">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{when(r.startedAt)}</span>
                  {r.finishedAt ? (
                    <Badge tone={r.errors.length ? 'warn' : 'good'}>
                      {r.items} éléments · {r.sourcesOk} sources OK
                      {r.errors.length ? ` · ${r.errors.length} en erreur` : ''}
                    </Badge>
                  ) : (
                    <Badge tone="brand">En cours</Badge>
                  )}
                </p>
                {r.errors.length > 0 && (
                  <ul className="mt-1.5 text-[12.5px] text-muted">
                    {r.errors.slice(0, 6).map((e) => (
                      <li key={e.source}>
                        <span className="font-semibold text-ink">{e.source}</span> : {e.error}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
