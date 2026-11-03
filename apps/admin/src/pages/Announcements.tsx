import type { AnnouncementInput, AnnouncementView } from '@devhub/contracts';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { Badge, Empty, PageHeader, when } from '../ui/kit';

const LEVELS = { info: 'Information', warning: 'Attention', success: 'Bonne nouvelle' } as const;
const blank: AnnouncementInput = {
  message: '',
  level: 'info',
  linkUrl: null,
  linkLabel: null,
  startsAt: null,
  endsAt: null,
  active: true,
};
/** datetime-local ⇄ ISO */
const toLocal = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

/** Bandeau d'annonce affiché en haut du site (maintenance, événement, nouveauté). */
export function Announcements({ onError }: { onError: (e: unknown) => void }) {
  const [rows, setRows] = useState<AnnouncementView[] | null>(null);
  const [edit, setEdit] = useState<{ id: string | null; v: AnnouncementInput } | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(
    () => api.announcements().then((r) => setRows(r.data), onError),
    [onError],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setErr('');
    try {
      if (edit.id) await api.updateAnnouncement(edit.id, edit.v);
      else await api.createAnnouncement(edit.v);
      setEdit(null);
      void load();
    } catch (e2) {
      onError(e2);
      setErr(errorMessage(e2));
    }
  };
  const set = <K extends keyof AnnouncementInput>(k: K, v: AnnouncementInput[K]) =>
    setEdit((p) => (p ? { ...p, v: { ...p.v, [k]: v } } : p));
  const now = Date.now();
  const live = (a: AnnouncementView) =>
    a.active &&
    new Date(a.startsAt).getTime() <= now &&
    (!a.endsAt || new Date(a.endsAt).getTime() > now);

  return (
    <section>
      <PageHeader title="Annonces">
        Un message en bandeau en haut de toutes les pages du site, pendant la période choisie (les
        trois plus récentes en ligne sont affichées).
      </PageHeader>
      {!edit && (
        <button
          type="button"
          className="btn-primary"
          onClick={() => setEdit({ id: null, v: blank })}
        >
          Nouvelle annonce
        </button>
      )}
      {edit && (
        <form
          onSubmit={save}
          className="grid max-w-[720px] gap-4 rounded-xl border border-line bg-panel p-5 sm:grid-cols-2"
        >
          <label className="block sm:col-span-2">
            <span className="text-[13px] font-semibold">Message (300 caractères max.)</span>
            <textarea
              className="field mt-1.5"
              rows={2}
              maxLength={300}
              required
              value={edit.v.message}
              onChange={(e) => set('message', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold">Ton</span>
            <select
              className="field mt-1.5"
              value={edit.v.level}
              onChange={(e) => set('level', e.target.value as AnnouncementInput['level'])}
            >
              {Object.entries(LEVELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={edit.v.active}
              onChange={(e) => set('active', e.target.checked)}
            />
            <span className="text-[14px]">En ligne</span>
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold">Lien (facultatif : /page ou https://)</span>
            <input
              className="field mt-1.5"
              value={edit.v.linkUrl ?? ''}
              onChange={(e) => set('linkUrl', e.target.value || null)}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold">Texte du lien</span>
            <input
              className="field mt-1.5"
              maxLength={40}
              value={edit.v.linkLabel ?? ''}
              onChange={(e) => set('linkLabel', e.target.value || null)}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold">Début (vide : tout de suite)</span>
            <input
              type="datetime-local"
              className="field mt-1.5"
              value={toLocal(edit.v.startsAt)}
              onChange={(e) => set('startsAt', fromLocal(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold">Fin (vide : sans fin)</span>
            <input
              type="datetime-local"
              className="field mt-1.5"
              value={toLocal(edit.v.endsAt)}
              onChange={(e) => set('endsAt', fromLocal(e.target.value))}
            />
          </label>
          {err && (
            <p
              role="alert"
              className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2"
            >
              {err}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
            <button type="button" className="btn-ghost" onClick={() => setEdit(null)}>
              Annuler
            </button>
          </div>
        </form>
      )}
      <ul className="mt-5 flex flex-col gap-2">
        {rows?.length === 0 && <Empty>Aucune annonce pour l’instant.</Empty>}
        {rows?.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-panel p-4">
            <p className="flex flex-wrap items-center gap-2">
              {live(a) ? <Badge tone="good">En ligne</Badge> : <Badge>Hors ligne</Badge>}
              <Badge
                tone={a.level === 'warning' ? 'warn' : a.level === 'success' ? 'good' : 'brand'}
              >
                {LEVELS[a.level]}
              </Badge>
            </p>
            <p className="mt-2 text-[15px]">{a.message}</p>
            <p className="mt-1 text-[12.5px] text-muted">
              Du {when(a.startsAt)} {a.endsAt ? `au ${when(a.endsAt)}` : 'sans fin'}
              {a.linkUrl && ` · lien ${a.linkUrl}`}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-ghost h-9"
                onClick={() =>
                  setEdit({
                    id: a.id,
                    v: {
                      message: a.message,
                      level: a.level,
                      linkUrl: a.linkUrl,
                      linkLabel: a.linkLabel,
                      startsAt: a.startsAt,
                      endsAt: a.endsAt,
                      active: a.active,
                    },
                  })
                }
              >
                Modifier
              </button>
              <button
                type="button"
                className="btn-danger h-9"
                onClick={async () => {
                  if (!confirm('Supprimer cette annonce ?')) return;
                  await api.deleteAnnouncement(a.id).catch(onError);
                  void load();
                }}
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
