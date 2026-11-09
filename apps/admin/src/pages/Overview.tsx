import type { AdminMonitoringView, AdminOverview } from '@devhub/contracts';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';

const CARDS: { key: keyof AdminOverview; label: string; hint?: string }[] = [
  { key: 'users', label: 'Membres', hint: 'comptes réels, hors démonstration' },
  { key: 'newUsers7d', label: 'Nouveaux (7 jours)' },
  { key: 'questions', label: 'Questions' },
  { key: 'answers', label: 'Réponses' },
  { key: 'rooms', label: 'Salles de projet' },
  { key: 'openReports', label: 'Signalements ouverts' },
  { key: 'publishedJobs', label: 'Offres publiées' },
  { key: 'draftJobs', label: 'Offres en brouillon' },
];

interface Todo {
  n: number;
  label: string;
  href: string;
  tone: 'bad' | 'warn';
}

export function Overview({ onError }: { onError: (e: unknown) => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [health, setHealth] = useState<AdminMonitoringView | null>(null);
  useEffect(() => {
    api.overview().then(setData, onError);
    // La supervision n'est qu'un complément : son échec ne bloque pas la vue d'ensemble.
    api.monitoring().then(setHealth, () => undefined);
  }, [onError]);

  const todos: Todo[] = [];
  if (data?.openReports)
    todos.push({
      n: data.openReports,
      label: 'signalement(s) à traiter',
      href: '#moderation',
      tone: 'bad',
    });
  if (data?.pendingCompanies)
    todos.push({
      n: data.pendingCompanies,
      label: 'entreprise(s) à vérifier',
      href: '#companies',
      tone: 'warn',
    });
  if (health && !health.worker.alive)
    todos.push({ n: 1, label: 'worker arrêté', href: '#monitoring', tone: 'bad' });
  if (health) {
    const failed = health.worker.queues.reduce((s, q) => s + q.failed24h, 0);
    if (failed)
      todos.push({
        n: failed,
        label: 'tâche(s) en échec (24 h)',
        href: '#monitoring',
        tone: 'warn',
      });
    const danger = health.config.filter((c) => c.state === 'danger').length;
    if (danger)
      todos.push({ n: danger, label: 'réglage(s) dangereux', href: '#monitoring', tone: 'bad' });
    if (health.http.recentErrors.length)
      todos.push({
        n: health.http.recentErrors.length,
        label: 'erreur(s) serveur récentes',
        href: '#monitoring',
        tone: 'warn',
      });
  }

  return (
    <section>
      <h1 className="text-[22px] font-bold">Vue d’ensemble</h1>
      <p className="mt-1 text-[14px] text-muted">Chiffres réels de la plateforme, à cet instant.</p>

      {data && (
        <div className="mt-6 rounded-xl border border-line bg-panel p-4">
          <h2 className="text-[15px] font-semibold">À traiter</h2>
          {todos.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {todos.map((t) => (
                <li key={t.label}>
                  <a
                    href={t.href}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[14px] hover:bg-page"
                  >
                    <span>
                      <span
                        className={`mr-2 inline-grid min-w-7 place-items-center rounded-full px-2 py-0.5 text-[12px] font-bold ${
                          t.tone === 'bad' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn'
                        }`}
                      >
                        {t.n}
                      </span>
                      {t.label}
                    </span>
                    <ArrowRight className="size-4 text-muted" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[14px] text-muted">Rien en attente. Tout est à jour.</p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.key} className="rounded-xl border border-line bg-panel p-4">
            <p className="text-[13px] text-muted">{c.label}</p>
            <p className="mt-1 text-[26px] font-bold tabular-nums">
              {data ? data[c.key].toLocaleString('fr-FR') : '…'}
            </p>
            {c.hint && <p className="text-[12px] text-muted">{c.hint}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
