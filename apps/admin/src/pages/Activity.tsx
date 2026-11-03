import type { AdminActivityItem, AdminStats } from '@devhub/contracts';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SITE_URL, api } from '../api';
import { Chips, Empty, PageHeader, ago } from '../ui/kit';

const METRICS = [
  { key: 'users', label: 'Inscriptions' },
  { key: 'questions', label: 'Questions' },
  { key: 'answers', label: 'Réponses' },
  { key: 'posts', label: 'Publications' },
  { key: 'rooms', label: 'Projets créés' },
  { key: 'applications', label: 'Candidatures' },
] as const;

const KINDS = [
  { id: 'all', label: 'Tout' },
  { id: 'user', label: 'Comptes' },
  { id: 'question', label: 'Questions' },
  { id: 'answer', label: 'Réponses' },
  { id: 'post', label: 'Publications' },
  { id: 'comment', label: 'Commentaires' },
  { id: 'room', label: 'Projets' },
  { id: 'application', label: 'Candidatures' },
  { id: 'company', label: 'Entreprises' },
  { id: 'job', label: 'Offres' },
  { id: 'admin', label: 'Administration' },
] as const;

/** Barres des 30 derniers jours pour une mesure ; le dernier jour est mis en avant. */
function Bars({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-[13px] text-muted">{label} · 30 jours</p>
      <p className="text-[24px] font-bold tabular-nums">{total}</p>
      <div
        className="mt-2 flex h-14 items-end gap-[2px]"
        role="img"
        aria-label={`${label} : ${total} sur 30 jours, ${values.at(-1)} aujourd’hui`}
      >
        {values.map((v, i) => (
          <span
            key={i}
            title={`${v}`}
            className={`flex-1 rounded-t-[2px] ${i === values.length - 1 ? 'bg-brand' : 'bg-brand/35'}`}
            style={{ height: `${Math.max(v ? 8 : 2, (v / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Statistiques dans le temps et fil de tout ce qui se passe sur la plateforme. */
export function Activity({ onError }: { onError: (e: unknown) => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [items, setItems] = useState<AdminActivityItem[] | null>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('all');

  useEffect(() => {
    api.stats().then(setStats, onError);
    api.activity().then((r) => setItems(r.data), onError);
    const t = setInterval(() => api.activity().then((r) => setItems(r.data), onError), 30_000);
    return () => clearInterval(t);
  }, [onError]);

  const shown = items?.filter((i) => kind === 'all' || i.kind === kind);

  return (
    <section>
      <PageHeader title="Activité">
        Ce qui se passe sur DevHub, jour par jour et en direct (actualisé toutes les 30 secondes).
      </PageHeader>
      {stats && (
        <>
          <div className="mb-3 flex flex-wrap gap-3 text-[14px]">
            <span className="rounded-lg bg-panel px-3 py-2 ring-1 ring-line">
              <strong className="tabular-nums">{stats.activeUsers7d}</strong> membres actifs sur 7
              jours
            </span>
            <span className="rounded-lg bg-panel px-3 py-2 ring-1 ring-line">
              <strong className="tabular-nums">{stats.activeUsers30d}</strong> sur 30 jours
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {METRICS.map((m) => (
              <Bars key={m.key} label={m.label} values={stats.days.map((d) => d[m.key])} />
            ))}
          </div>
        </>
      )}
      <h2 className="mt-8 mb-3 text-[17px] font-semibold">Fil d’activité</h2>
      <Chips value={kind} onChange={setKind} options={KINDS} />
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-panel">
        {!shown && <li className="p-4 text-muted">Chargement…</li>}
        {shown?.length === 0 && (
          <li>
            <Empty />
          </li>
        )}
        {shown?.map((i, n) => (
          <li
            key={`${i.at}-${n}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[14px]"
          >
            <span className="w-24 shrink-0 text-[12.5px] text-muted">{ago(i.at)}</span>
            <span className="min-w-0 flex-1">
              {i.label}
              {i.actor && <span className="text-muted"> · {i.actor}</span>}
            </span>
            {i.path && (
              <a
                href={`${SITE_URL}${i.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-ink"
                aria-label="Voir sur le site"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
