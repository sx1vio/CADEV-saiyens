import type { AdminCompanyAction, AdminCompanyView } from '@devhub/contracts';
import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';

const STATUS: Record<AdminCompanyView['status'], { label: string; tone: string }> = {
  pending: { label: 'À vérifier', tone: 'bg-warn-soft text-warn' },
  verified: { label: 'Validée', tone: 'bg-good-soft text-good' },
  rejected: { label: 'Refusée', tone: 'bg-bad-soft text-bad' },
  suspended: { label: 'Suspendue', tone: 'bg-page text-muted' },
};

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    : 'jamais';

/** Entreprises du portail business : vérifier avant qu'elles publient, suspendre si besoin. */
export function Companies({ onError }: { onError: (e: unknown) => void }) {
  const [filter, setFilter] = useState<'' | AdminCompanyView['status']>('pending');
  const [rows, setRows] = useState<AdminCompanyView[] | null>(null);
  const load = useCallback(() => {
    setRows(null);
    api.companies(filter || undefined).then((r) => setRows(r.data), onError);
  }, [filter, onError]);
  useEffect(load, [load]);

  const act = async (c: AdminCompanyView, action: AdminCompanyAction['action']) => {
    const needsReason = action === 'reject' || action === 'suspend';
    const reason = needsReason
      ? prompt(
          action === 'reject'
            ? 'Raison du refus (visible par l’entreprise) :'
            : 'Raison de la suspension :',
        )
      : '';
    if (needsReason && (!reason || reason.trim().length < 3)) return;
    try {
      await api.companyAction(c.id, { action, reason: reason?.trim() ?? '' });
      load();
    } catch (e) {
      onError(e);
      alert(errorMessage(e));
    }
  };

  return (
    <section>
      <h1 className="text-[22px] font-bold">Entreprises</h1>
      <p className="mt-1 max-w-2xl text-[14px] text-muted">
        Vérifie qu’une entreprise existe (site, adresse e-mail professionnelle, présence publique)
        avant de la valider : ses offres seront ensuite publiées sans relecture.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {(['pending', 'verified', 'rejected', 'suspended', ''] as const).map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
              filter === s
                ? 'bg-ink text-white'
                : 'bg-panel text-muted ring-1 ring-line hover:text-ink'
            }`}
          >
            {s ? STATUS[s].label : 'Toutes'}
          </button>
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {!rows && <li className="text-muted">Chargement…</li>}
        {rows?.length === 0 && (
          <li className="rounded-xl border border-line bg-panel px-4 py-8 text-center text-muted">
            Rien à afficher.
          </li>
        )}
        {rows?.map((c) => (
          <li key={c.id} className="rounded-xl border border-line bg-panel p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold">{c.name}</p>
                <p className="text-[13px] text-muted">
                  {c.sector} · {c.size} personnes
                  {c.city && ` · ${c.city}`}
                  {c.country && ` (${c.country})`} · inscrite le {when(c.createdAt)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS[c.status].tone}`}
              >
                {STATUS[c.status].label}
              </span>
            </div>
            {c.about && <p className="mt-2 text-[14px] whitespace-pre-wrap">{c.about}</p>}
            <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
              <div>
                <p className="font-semibold">Comptes</p>
                {c.accounts.map((a) => (
                  <p key={a.email} className="text-muted">
                    {a.name} · {a.email} · {a.role === 'owner' ? 'propriétaire' : 'recruteur'} ·
                    dernière connexion {when(a.lastLoginAt)}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-semibold">Activité</p>
                <p className="text-muted">
                  {c.offers} offre{c.offers > 1 ? 's' : ''} · {c.applications} candidature
                  {c.applications > 1 ? 's' : ''}
                </p>
                {c.statusReason && <p className="text-muted">Motif : {c.statusReason}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.website && (
                <a
                  href={c.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost h-9"
                >
                  Site web <ExternalLink className="size-4" />
                </a>
              )}
              {(c.status === 'pending' || c.status === 'rejected') && (
                <button type="button" className="btn-primary h-9" onClick={() => act(c, 'verify')}>
                  Valider
                </button>
              )}
              {c.status === 'pending' && (
                <button type="button" className="btn-danger h-9" onClick={() => act(c, 'reject')}>
                  Refuser
                </button>
              )}
              {c.status === 'verified' && (
                <button type="button" className="btn-danger h-9" onClick={() => act(c, 'suspend')}>
                  Suspendre
                </button>
              )}
              {c.status === 'suspended' && (
                <button type="button" className="btn-ghost h-9" onClick={() => act(c, 'restore')}>
                  Réactiver
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
