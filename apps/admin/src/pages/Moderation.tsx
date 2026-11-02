import type { AdminReportView, AuditEntry } from '@devhub/contracts';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  hide_content: 'Contenu masqué',
  restore_content: 'Contenu rétabli',
  dismiss_report: 'Signalement rejeté',
  job_create: 'Offre créée',
  job_update: 'Offre modifiée',
  job_delete: 'Offre supprimée',
  admin_sign_in: 'Connexion à l’administration',
};

const TARGET_LABEL: Record<string, string> = {
  question: 'Question',
  answer: 'Réponse',
  room: 'Salle',
  room_message: 'Message de salle',
  user: 'Compte',
  job_offer: 'Offre',
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export function Moderation({ onError }: { onError: (e: unknown) => void }) {
  const [view, setView] = useState<'open' | 'actioned' | 'dismissed' | 'audit'>('open');
  return (
    <section>
      <h1 className="text-[22px] font-bold">Modération</h1>
      <p className="mt-1 text-[14px] text-muted">
        Masquer retire le contenu tout de suite (jamais supprimé, il peut être rétabli). Chaque
        décision est journalisée.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ['open', 'À traiter'],
            ['actioned', 'Masqués'],
            ['dismissed', 'Rejetés'],
            ['audit', 'Journal'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
              view === k
                ? 'bg-ink text-white'
                : 'bg-panel text-muted ring-1 ring-line hover:text-ink'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {view === 'audit' ? (
          <Audit onError={onError} />
        ) : (
          <Reports status={view} onError={onError} />
        )}
      </div>
    </section>
  );
}

function Reports({
  status,
  onError,
}: {
  status: 'open' | 'actioned' | 'dismissed';
  onError: (e: unknown) => void;
}) {
  const [rows, setRows] = useState<AdminReportView[] | null>(null);
  const load = useCallback(() => {
    setRows(null);
    api.reports(status).then((r) => setRows(r.data), onError);
  }, [status, onError]);
  useEffect(load, [load]);

  const act = async (r: AdminReportView, action: 'hide' | 'restore' | 'dismiss') => {
    const reason = prompt(
      action === 'hide'
        ? 'Raison du retrait (visible dans le journal) :'
        : action === 'restore'
          ? 'Raison du rétablissement :'
          : 'Raison du rejet :',
      action === 'dismiss' ? 'Contenu conforme aux règles' : '',
    );
    if (!reason || reason.trim().length < 3) return;
    try {
      await api.reportAction(r.id, {
        action,
        reason: reason.trim(),
        revertXp: action === 'hide',
      });
      load();
    } catch (e) {
      onError(e);
      alert(errorMessage(e));
    }
  };

  if (!rows) return <p className="text-muted">Chargement…</p>;
  if (!rows.length)
    return (
      <p className="rounded-xl border border-line bg-panel px-4 py-8 text-center text-muted">
        Rien à afficher.
      </p>
    );
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded-xl border border-line bg-panel p-4">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <span className="rounded-full bg-page px-2 py-0.5 font-semibold text-ink">
              {TARGET_LABEL[r.targetType] ?? r.targetType}
            </span>
            <span>signalé par @{r.reporter.handle}</span>
            <span>· {when(r.createdAt)}</span>
            {r.openReportsOnTarget > 1 && (
              <span className="rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-warn">
                {r.openReportsOnTarget} signalements
              </span>
            )}
          </div>
          <p className="mt-2 text-[14px]">
            <span className="font-semibold">Motif :</span> {r.reason}
          </p>
          {r.target ? (
            <blockquote className="mt-2 rounded-lg border-l-4 border-line bg-page px-3 py-2 text-[13.5px] whitespace-pre-wrap">
              {r.target.excerpt}
              {r.target.author && (
                <span className="mt-1 block text-[12.5px] text-muted">
                  — @{r.target.author.handle}
                </span>
              )}
            </blockquote>
          ) : (
            <p className="mt-2 text-[13px] text-muted">Le contenu n’existe plus.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {status === 'open' && r.target && !r.target.hidden && r.targetType !== 'user' && (
              <button type="button" className="btn-danger h-9" onClick={() => act(r, 'hide')}>
                Masquer
              </button>
            )}
            {status === 'actioned' && (
              <button type="button" className="btn-ghost h-9" onClick={() => act(r, 'restore')}>
                Rétablir
              </button>
            )}
            {status === 'open' && (
              <button type="button" className="btn-ghost h-9" onClick={() => act(r, 'dismiss')}>
                Rejeter
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Audit({ onError }: { onError: (e: unknown) => void }) {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  useEffect(() => {
    api.audit().then((r) => setRows(r.data), onError);
  }, [onError]);
  if (!rows) return <p className="text-muted">Chargement…</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead className="border-b border-line text-[12px] tracking-wide text-muted uppercase">
          <tr>
            <th className="px-4 py-3 font-semibold">Quand</th>
            <th className="px-4 py-3 font-semibold">Qui</th>
            <th className="px-4 py-3 font-semibold">Action</th>
            <th className="px-4 py-3 font-semibold">Détail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 whitespace-nowrap text-muted tabular-nums">
                {when(a.createdAt)}
              </td>
              <td className="px-4 py-3">@{a.admin.handle}</td>
              <td className="px-4 py-3">
                {ACTION_LABEL[a.action]}
                <span className="ml-1 text-muted">
                  · {TARGET_LABEL[a.targetType] ?? a.targetType}
                </span>
              </td>
              <td className="px-4 py-3 text-muted">{a.reason}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted">
                Journal vide.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
