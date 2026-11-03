import type { AdminRole, AdminUserAction, AdminUserView } from '@devhub/contracts';
import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SITE_URL, api, errorMessage } from '../api';
import { Badge, Chips, Empty, PageHeader, SearchBox, ago, when } from '../ui/kit';

type Filter = 'all' | 'new' | 'suspended' | 'admins' | 'demo' | 'deleted';
const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'new', label: 'Nouveaux (7 j)' },
  { id: 'suspended', label: 'Suspendus' },
  { id: 'admins', label: 'Administrateurs' },
  { id: 'demo', label: 'Démo' },
  { id: 'deleted', label: 'Supprimés' },
] as const;
const PAGE = 50;

/** Tous les comptes : rechercher, suspendre, réactiver, marquer démo, supprimer. */
export function Users({ role, onError }: { role: AdminRole; onError: (e: unknown) => void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [offset, setOffset] = useState(0);
  const [res, setRes] = useState<{ data: AdminUserView[]; total: number } | null>(null);

  const load = useCallback(() => {
    api.users({ q: q.trim() || undefined, filter, offset }).then(setRes, onError);
  }, [q, filter, offset, onError]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (u: AdminUserView, action: AdminUserAction['action']) => {
    let reason = '';
    if (action === 'suspend') {
      reason = prompt(`Raison de la suspension de @${u.handle} :`)?.trim() ?? '';
      if (reason.length < 3) return;
    }
    if (
      action === 'delete' &&
      !confirm(
        `Supprimer définitivement le compte @${u.handle} ? Il est anonymisé : ses contenus restent, attribués à « Compte supprimé ». Irréversible.`,
      )
    )
      return;
    try {
      await api.userAction(u.id, { action, reason });
      load();
    } catch (e) {
      onError(e);
      alert(errorMessage(e));
    }
  };

  return (
    <section>
      <PageHeader title="Utilisateurs">
        Tous les comptes de la plateforme. Suspendre ferme aussitôt ses sessions ; supprimer
        anonymise le compte (réservé aux super-administrateurs). Chaque action est journalisée.
      </PageHeader>
      <div className="flex flex-col gap-3">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setOffset(0);
          }}
          placeholder="Pseudo, nom ou e-mail"
        />
        <Chips
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setOffset(0);
          }}
          options={FILTERS}
        />
      </div>
      <p className="mt-4 text-[13px] text-muted">
        {res ? `${res.total} compte${res.total > 1 ? 's' : ''}` : 'Chargement…'}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {res?.data.length === 0 && <Empty />}
        {res?.data.map((u) => (
          <li key={u.id} className="rounded-xl border border-line bg-panel p-4">
            <div className="flex flex-wrap items-start gap-3">
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt="" className="size-10 rounded-full" />
              ) : (
                <span className="grid size-10 place-items-center rounded-full bg-brand-soft font-bold text-brand">
                  {u.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {u.displayName}
                  <span className="font-normal text-muted">@{u.handle}</span>
                  {u.isAdmin && (
                    <Badge tone="brand">
                      {u.adminRole === 'moderator' ? 'Modérateur' : 'Super-admin'}
                    </Badge>
                  )}
                  {u.suspendedAt && <Badge tone="bad">Suspendu</Badge>}
                  {u.isDemo && <Badge tone="warn">Démo</Badge>}
                  {u.deleted && <Badge>Supprimé</Badge>}
                  {u.githubLinked && <Badge tone="good">GitHub</Badge>}
                </p>
                <p className="text-[13px] text-muted">
                  {u.email ?? 'sans e-mail'}
                  {u.country && ` · ${u.country}`} · inscrit le {when(u.createdAt)} · vu{' '}
                  {u.lastSeenAt ? ago(u.lastSeenAt) : 'jamais'}
                </p>
                <p className="mt-1 text-[13px]">
                  {u.stats.xp} Proof XP · {u.stats.questions} questions · {u.stats.answers} réponses
                  · {u.stats.posts} publications · {u.stats.rooms} projets
                  {u.stats.reportsAgainst > 0 && (
                    <span className="font-semibold text-bad">
                      {' '}
                      · {u.stats.reportsAgainst} signalement(s)
                    </span>
                  )}
                </p>
                {u.suspensionReason && (
                  <p className="mt-1 text-[13px] text-bad">Motif : {u.suspensionReason}</p>
                )}
              </div>
            </div>
            {!u.deleted && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`${SITE_URL}/u/${u.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost h-9"
                >
                  Passport <ExternalLink className="size-4" />
                </a>
                {!u.isAdmin &&
                  (u.suspendedAt ? (
                    <button
                      type="button"
                      className="btn-ghost h-9"
                      onClick={() => act(u, 'unsuspend')}
                    >
                      Réactiver
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-danger h-9"
                      onClick={() => act(u, 'suspend')}
                    >
                      Suspendre
                    </button>
                  ))}
                <button
                  type="button"
                  className="btn-ghost h-9"
                  onClick={() => act(u, u.isDemo ? 'unmark_demo' : 'mark_demo')}
                >
                  {u.isDemo ? 'Retirer « démo »' : 'Marquer démo'}
                </button>
                {role === 'super' && !u.isAdmin && (
                  <button type="button" className="btn-danger h-9" onClick={() => act(u, 'delete')}>
                    Supprimer le compte
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {res && res.total > PAGE && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="btn-ghost h-9"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
          >
            Précédents
          </button>
          <span className="text-[13px] text-muted">
            {offset + 1}–{Math.min(offset + PAGE, res.total)} sur {res.total}
          </span>
          <button
            type="button"
            className="btn-ghost h-9"
            disabled={offset + PAGE >= res.total}
            onClick={() => setOffset(offset + PAGE)}
          >
            Suivants
          </button>
        </div>
      )}
    </section>
  );
}
