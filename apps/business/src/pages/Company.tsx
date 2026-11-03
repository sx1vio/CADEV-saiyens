import type { BusinessMeView, CompanyProfileInput } from '@devhub/contracts';
import { type FormEvent, useState } from 'react';
import { ApiError, api, errorMessage } from '../api';
import { StatusBanner } from '../App';

const SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;

/** Profil public de l'entreprise (page /entreprises/:slug une fois validée). */
export function Company({
  me,
  onSaved,
  onError,
}: {
  me: BusinessMeView;
  onSaved: () => void;
  onError: (e: unknown) => void;
}) {
  const c = me.company;
  const [v, setV] = useState<CompanyProfileInput>({
    name: c.name,
    website: c.website,
    country: c.country,
    city: c.city,
    sector: c.sector,
    size: c.size,
    about: c.about,
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CompanyProfileInput>(k: K, val: CompanyProfileInput[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setFields({});
    try {
      await api.updateCompany(v);
      setMsg({ ok: true, text: 'Profil enregistré.' });
      onSaved();
    } catch (err) {
      onError(err);
      if (err instanceof ApiError) setFields(err.fields);
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-[720px]">
      <h1 className="text-[22px] font-bold">Entreprise</h1>
      <p className="mt-1 mb-6 text-[14px] text-muted">
        Ces informations apparaissent sur votre page publique et sur chacune de vos offres.
      </p>
      <StatusBanner me={me} />
      <form
        onSubmit={save}
        className="grid gap-4 rounded-xl border border-line bg-panel p-5 sm:grid-cols-2"
      >
        <label className="block sm:col-span-2">
          <span className="text-[13px] font-semibold">
            Nom
            {c.status === 'verified' && (
              <span className="ml-1.5 font-normal text-muted">
                vérifié : contactez DevHub pour le changer
              </span>
            )}
          </span>
          <input
            className="field mt-1.5"
            required
            disabled={c.status === 'verified'}
            value={v.name}
            onChange={(e) => set('name', e.target.value)}
          />
          {fields.name && <span className="mt-1 block text-[12.5px] text-bad">{fields.name}</span>}
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[13px] font-semibold">Site web</span>
          <input
            className="field mt-1.5"
            type="url"
            value={v.website ?? ''}
            onChange={(e) => set('website', e.target.value || null)}
            placeholder="https://"
          />
          {fields.website && (
            <span className="mt-1 block text-[12.5px] text-bad">{fields.website}</span>
          )}
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Pays (code ISO)</span>
          <input
            className="field mt-1.5 uppercase"
            maxLength={2}
            value={v.country ?? ''}
            onChange={(e) => set('country', e.target.value.toUpperCase() || null)}
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Ville</span>
          <input
            className="field mt-1.5"
            value={v.city ?? ''}
            onChange={(e) => set('city', e.target.value || null)}
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Secteur</span>
          <input
            className="field mt-1.5"
            required
            value={v.sector}
            onChange={(e) => set('sector', e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Taille</span>
          <select
            className="field mt-1.5"
            value={v.size}
            onChange={(e) => set('size', e.target.value as CompanyProfileInput['size'])}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s} personnes
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[13px] font-semibold">Présentation</span>
          <textarea
            className="field mt-1.5"
            rows={6}
            value={v.about}
            onChange={(e) => set('about', e.target.value)}
            placeholder="Mission, produits, équipe tech, façon de travailler…"
          />
        </label>
        {msg && (
          <p
            role="status"
            className={`rounded-lg px-3 py-2 text-[13px] sm:col-span-2 ${msg.ok ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}
          >
            {msg.text}
          </p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </section>
  );
}
