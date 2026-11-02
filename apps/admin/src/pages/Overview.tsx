import type { AdminOverview } from '@devhub/contracts';
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

export function Overview({ onError }: { onError: (e: unknown) => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  useEffect(() => {
    api.overview().then(setData, onError);
  }, [onError]);
  return (
    <section>
      <h1 className="text-[22px] font-bold">Vue d’ensemble</h1>
      <p className="mt-1 text-[14px] text-muted">Chiffres réels de la plateforme, à cet instant.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
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
