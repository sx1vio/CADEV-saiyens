import type { BusinessMeView, BusinessTeamMember } from '@devhub/contracts';
import { Copy, KeyRound, UserMinus, UserPlus } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api, errorMessage } from '../api';

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : 'jamais';

/** Compte du recruteur (mot de passe) et équipe de recrutement de l'entreprise. */
export function Account({ me, onError }: { me: BusinessMeView; onError: (e: unknown) => void }) {
  return (
    <section className="max-w-3xl">
      <h1 className="text-[22px] font-bold">Compte et équipe</h1>
      <p className="mt-1 mb-6 text-[14px] text-muted">
        Votre accès personnel et les personnes qui recrutent pour {me.company.name}.
      </p>
      <Team me={me} onError={onError} />
      <Password onError={onError} />
    </section>
  );
}

function Team({ me, onError }: { me: BusinessMeView; onError: (e: unknown) => void }) {
  const owner = me.account.role === 'owner';
  const [team, setTeam] = useState<BusinessTeamMember[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api.team().then((r) => setTeam(r.data), onError);
  }, [onError]);
  useEffect(load, [load]);

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.invite({ name: name.trim(), email: email.trim() });
      setInvited({ email: r.member.email, password: r.password });
      setCopied(false);
      setName('');
      setEmail('');
      load();
    } catch (err) {
      onError(err);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: BusinessTeamMember) => {
    if (!confirm(`Retirer ${m.name} ? Son accès est fermé tout de suite.`)) return;
    try {
      await api.removeMember(m.id);
      load();
    } catch (err) {
      onError(err);
      alert(errorMessage(err));
    }
  };

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h2 className="text-[16px] font-semibold">Équipe de recrutement</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        Chaque recruteur a son propre accès : il publie des offres et suit les candidatures.
        {!owner && ' Seul le propriétaire du compte ajoute ou retire des recruteurs.'}
      </p>
      <ul className="mt-4 divide-y divide-line">
        {(team ?? []).map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {m.name}
                {m.id === me.account.id && <span className="ml-1.5 text-muted">(vous)</span>}
              </p>
              <p className="truncate text-[13px] text-muted">
                {m.email} · {m.role === 'owner' ? 'propriétaire' : 'recruteur'} · dernière connexion
                : {when(m.lastLoginAt)}
              </p>
            </div>
            {owner && m.role === 'recruiter' && (
              <button
                type="button"
                onClick={() => remove(m)}
                className="btn-ghost h-9 shrink-0 text-bad"
                aria-label={`Retirer ${m.name}`}
              >
                <UserMinus className="size-4" />
                <span className="hidden sm:inline">Retirer</span>
              </button>
            )}
          </li>
        ))}
        {!team && <li className="py-2.5 text-[14px] text-muted">Chargement…</li>}
      </ul>

      {invited && (
        <div className="mt-4 rounded-lg bg-warn-soft p-3 text-[13.5px]" role="status">
          <p className="font-semibold">Accès créé pour {invited.email}</p>
          <p className="mt-1">
            Transmettez-lui ce mot de passe provisoire par un canal sûr. Il ne sera plus affiché ;
            le recruteur le change depuis cet onglet après sa première connexion.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-panel px-2 py-1 font-mono text-[14px]">
              {invited.password}
            </code>
            <button
              type="button"
              className="btn-ghost h-8"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(invited.password)
                  .then(() => setCopied(true))
                  .catch(() => undefined)
              }
            >
              <Copy className="size-4" />
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>
      )}

      {owner && (
        <form
          onSubmit={invite}
          className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="block">
            <span className="text-[13px] font-semibold">Nom</span>
            <input
              className="field mt-1"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold">E-mail professionnel</span>
            <input
              className="field mt-1"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary self-end" disabled={busy}>
            <UserPlus className="size-4" />
            {busy ? 'Ajout…' : 'Ajouter'}
          </button>
          {error && (
            <p role="alert" className="text-[13px] text-bad sm:col-span-3">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function Password({ onError }: { onError: (e: unknown) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < 10) return setMsg({ ok: false, text: '10 caractères au moins.' });
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setCurrent('');
      setNext('');
      setMsg({ ok: true, text: 'Mot de passe changé. Vos autres sessions ont été fermées.' });
    } catch (err) {
      // Mauvais mot de passe actuel : 401, ce n'est pas une session expirée.
      if (!(err instanceof ApiError && err.status === 401)) onError(err);
      setMsg({
        ok: false,
        text:
          err instanceof ApiError && err.status === 401
            ? 'Mot de passe actuel incorrect.'
            : errorMessage(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold">
        <KeyRound className="size-4 text-accent" />
        Mot de passe
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] font-semibold">Mot de passe actuel</span>
          <input
            className="field mt-1"
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Nouveau (10 caractères au moins)</span>
          <input
            className="field mt-1"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </label>
      </div>
      {msg && (
        <p
          role={msg.ok ? 'status' : 'alert'}
          className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${msg.ok ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}
        >
          {msg.text}
        </p>
      )}
      <button type="submit" className="btn-primary mt-4" disabled={busy}>
        {busy ? 'Enregistrement…' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}
