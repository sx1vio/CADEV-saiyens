import type { AdminAccountView, AdminInviteResponse, AdminRole } from '@devhub/contracts';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { Badge, PageHeader, when } from '../ui/kit';

const ROLES: Record<AdminRole, string> = {
  super: 'Super-admin : tout, y compris les administrateurs et la suppression de comptes',
  moderator: 'Modérateur : comptes, contenus, entreprises, offres, annonces',
};

/** Équipe d'administration : rôles, invitation avec double facteur, retrait d'accès. */
export function Admins({
  me,
  role,
  onError,
}: {
  me: string;
  role: AdminRole;
  onError: (e: unknown) => void;
}) {
  const [rows, setRows] = useState<AdminAccountView[] | null>(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'moderator' as AdminRole });
  const [created, setCreated] = useState<AdminInviteResponse | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api.admins().then((r) => setRows(r.data), onError), [onError]);
  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      setCreated(await api.inviteAdmin(form));
      setForm({ email: '', name: '', role: 'moderator' });
      void load();
    } catch (e2) {
      onError(e2);
      setErr(errorMessage(e2));
    }
  };
  const change = async (a: AdminAccountView, next: AdminRole | null) => {
    if (next === null && !confirm(`Retirer l’accès d’administration de ${a.email ?? a.handle} ?`))
      return;
    try {
      await api.setAdminRole(a.id, next);
      void load();
    } catch (e) {
      onError(e);
      alert(errorMessage(e));
    }
  };

  return (
    <section>
      <PageHeader title="Administrateurs">
        Chaque compte d’administration a son mot de passe et son double facteur. Les comptes
        d’administration sont séparés des comptes devs.
      </PageHeader>
      <ul className="flex flex-col gap-2">
        {rows?.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {a.displayName}
                <Badge tone={a.role === 'super' ? 'brand' : 'muted'}>
                  {a.role === 'super' ? 'Super-admin' : 'Modérateur'}
                </Badge>
                {!a.twoFactor && <Badge tone="bad">Sans double facteur</Badge>}
                {a.handle === me && <Badge tone="good">Toi</Badge>}
              </p>
              <p className="text-[13px] text-muted">
                {a.email ?? '(sans e-mail)'} · dernière connexion {when(a.lastSignInAt)}
              </p>
            </div>
            {role === 'super' && a.handle !== me && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost h-9"
                  onClick={() => change(a, a.role === 'super' ? 'moderator' : 'super')}
                >
                  {a.role === 'super' ? 'Passer modérateur' : 'Passer super-admin'}
                </button>
                <button type="button" className="btn-danger h-9" onClick={() => change(a, null)}>
                  Retirer l’accès
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {role === 'super' ? (
        <>
          <h2 className="mt-8 mb-3 text-[17px] font-semibold">Ajouter un administrateur</h2>
          {created && (
            <div
              role="status"
              className="mb-4 max-w-[720px] rounded-xl border border-warn/40 bg-warn-soft p-4 text-[14px]"
            >
              <p className="font-semibold">
                Compte créé pour {created.email}. Transmets ces informations par un canal sûr :
                elles ne seront plus affichées.
              </p>
              <p className="mt-2">
                Mot de passe :{' '}
                <code className="rounded bg-white px-1.5 py-0.5 select-all">
                  {created.password}
                </code>
              </p>
              <p className="mt-1">
                Secret du double facteur :{' '}
                <code className="rounded bg-white px-1.5 py-0.5 select-all">
                  {created.secret.replace(/(.{4})/g, '$1 ').trim()}
                </code>
              </p>
              <p className="mt-1 break-all text-[12.5px] text-muted">
                Lien à ouvrir dans l’application d’authentification : {created.otpauthUrl}
              </p>
              <button type="button" className="btn-ghost mt-3 h-9" onClick={() => setCreated(null)}>
                J’ai transmis, masquer
              </button>
            </div>
          )}
          <form
            onSubmit={invite}
            className="grid max-w-[720px] gap-4 rounded-xl border border-line bg-panel p-5 sm:grid-cols-2"
          >
            <label className="block">
              <span className="text-[13px] font-semibold">Nom</span>
              <input
                className="field mt-1.5"
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">E-mail</span>
              <input
                type="email"
                className="field mt-1.5"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-[13px] font-semibold">Rôle</legend>
              {(Object.keys(ROLES) as AdminRole[]).map((r) => (
                <label key={r} className="mt-1.5 flex items-center gap-2 text-[14px]">
                  <input
                    type="radio"
                    name="role"
                    checked={form.role === r}
                    onChange={() => setForm({ ...form, role: r })}
                  />
                  {ROLES[r]}
                </label>
              ))}
            </fieldset>
            {err && (
              <p
                role="alert"
                className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2"
              >
                {err}
              </p>
            )}
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">
                Créer le compte
              </button>
            </div>
          </form>
        </>
      ) : (
        <p className="mt-6 text-[14px] text-muted">
          Seuls les super-administrateurs ajoutent ou retirent des administrateurs.
        </p>
      )}
    </section>
  );
}
