import type { AdminJobView, JobOfferInput } from '@devhub/contracts';
import { ExternalLink, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api, errorMessage } from '../api';

const CONTRACTS = [
  ['cdi', 'CDI'],
  ['cdd', 'CDD'],
  ['freelance', 'Freelance'],
  ['stage', 'Stage'],
  ['alternance', 'Alternance'],
] as const;
const MODES = [
  ['remote', 'Télétravail'],
  ['hybrid', 'Hybride'],
  ['onsite', 'Sur site'],
] as const;
const LEVELS = [
  ['junior', 'Junior'],
  ['confirme', 'Confirmé'],
  ['senior', 'Senior'],
  ['lead', 'Lead'],
] as const;
const STATUS_LABEL: Record<AdminJobView['status'], string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  archived: 'Archivée',
};

const EMPTY: JobOfferInput = {
  title: '',
  company: '',
  companyUrl: null,
  location: '',
  country: null,
  workMode: 'remote',
  contract: 'cdi',
  seniority: 'confirme',
  salary: null,
  description: '',
  applyUrl: '',
  sourceUrl: '',
  tags: [],
  expiresAt: null,
  status: 'draft',
};

const toInput = (j: AdminJobView): JobOfferInput => {
  const { id: _i, publishedAt: _p, createdAt: _c, updatedAt: _u, ...rest } = j;
  return rest;
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const expired = (j: AdminJobView) => !!j.expiresAt && new Date(j.expiresAt) <= new Date();

export function Jobs({ onError }: { onError: (e: unknown) => void }) {
  const [jobs, setJobs] = useState<AdminJobView[] | null>(null);
  const [filter, setFilter] = useState<'all' | AdminJobView['status']>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AdminJobView | 'new' | null>(null);

  const load = useCallback(() => {
    api.jobs().then((r) => setJobs(r.data), onError);
  }, [onError]);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (jobs ?? []).filter(
      (j) =>
        (filter === 'all' || j.status === filter) &&
        (!needle || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(needle)),
    );
  }, [jobs, filter, q]);

  const remove = async (j: AdminJobView) => {
    if (
      !confirm(
        `Supprimer définitivement « ${j.title} » ? Préfère « Archivée » pour garder une trace.`,
      )
    )
      return;
    try {
      await api.deleteJob(j.id);
      load();
    } catch (e) {
      onError(e);
      alert(errorMessage(e));
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">Offres d’emploi</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-muted">
            Seules les offres « Publiées » et non expirées apparaissent sur DevHub. Chaque offre
            renvoie vers sa page officielle : aucune offre sans source vérifiable.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          <Plus className="size-4" />
          Nouvelle offre
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(['all', 'published', 'draft', 'archived'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
              filter === s
                ? 'bg-ink text-white'
                : 'bg-panel text-muted ring-1 ring-line hover:text-ink'
            }`}
          >
            {s === 'all' ? 'Toutes' : STATUS_LABEL[s]}
            {jobs && (
              <span className="ml-1.5 opacity-70">
                {s === 'all' ? jobs.length : jobs.filter((j) => j.status === s).length}
              </span>
            )}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Titre, entreprise, lieu"
            className="field pl-9"
            aria-label="Rechercher une offre"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead className="border-b border-line text-[12px] tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Offre</th>
              <th className="px-4 py-3 font-semibold">Lieu</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Publiée le</th>
              <th className="px-4 py-3 font-semibold">Expire le</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {jobs === null && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Chargement…
                </td>
              </tr>
            )}
            {jobs && shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Aucune offre ici. Ajoute la première avec « Nouvelle offre ».
                </td>
              </tr>
            )}
            {shown.map((j) => (
              <tr key={j.id} className="border-b border-line last:border-0 hover:bg-page/60">
                <td className="px-4 py-3">
                  <p className="font-semibold">{j.title}</p>
                  <p className="text-[13px] text-muted">{j.company}</p>
                </td>
                <td className="px-4 py-3 text-muted">{j.location}</td>
                <td className="px-4 py-3">
                  <StatusBadge job={j} />
                </td>
                <td className="px-4 py-3 text-muted tabular-nums">{fmt(j.publishedAt)}</td>
                <td className="px-4 py-3 text-muted tabular-nums">{fmt(j.expiresAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <a
                      href={j.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-page hover:text-ink"
                      title="Ouvrir la source officielle"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditing(j)}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-page hover:text-ink"
                      title="Modifier"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(j)}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad"
                      title="Supprimer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <JobEditor
          job={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onError={onError}
        />
      )}
    </section>
  );
}

function StatusBadge({ job }: { job: AdminJobView }) {
  const isExpired = job.status === 'published' && expired(job);
  const cls = isExpired
    ? 'bg-warn-soft text-warn'
    : job.status === 'published'
      ? 'bg-good-soft text-good'
      : job.status === 'draft'
        ? 'bg-brand-soft text-brand'
        : 'bg-page text-muted';
  return (
    <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${cls}`}>
      {isExpired ? 'Expirée' : STATUS_LABEL[job.status]}
    </span>
  );
}

function JobEditor({
  job,
  onClose,
  onSaved,
  onError,
}: {
  job: AdminJobView | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (e: unknown) => void;
}) {
  const [v, setV] = useState<JobOfferInput>(job ? toInput(job) : EMPTY);
  const [tags, setTags] = useState((job?.tags ?? []).join(', '));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof JobOfferInput>(k: K, val: JobOfferInput[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const opt = (s: string) => (s.trim() ? s.trim() : null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const body: JobOfferInput = {
      ...v,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      if (job) await api.updateJob(job.id, body);
      else await api.createJob(body);
      onSaved();
    } catch (err) {
      onError(err);
      if (err instanceof ApiError) setFields(err.fields);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-editor-title"
    >
      <form
        onSubmit={save}
        className="flex h-full w-full max-w-[720px] flex-col bg-panel shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="job-editor-title" className="text-[18px] font-bold">
            {job ? 'Modifier l’offre' : 'Nouvelle offre'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg hover:bg-page"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Intitulé du poste" error={fields.title} wide>
              <input
                className="field"
                required
                value={v.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Développeur·se back-end Node.js"
              />
            </F>
            <F label="Entreprise" error={fields.company}>
              <input
                className="field"
                required
                value={v.company}
                onChange={(e) => set('company', e.target.value)}
              />
            </F>
            <F label="Site de l’entreprise" error={fields.companyUrl} hint="facultatif, https://">
              <input
                className="field"
                type="url"
                value={v.companyUrl ?? ''}
                onChange={(e) => set('companyUrl', opt(e.target.value))}
              />
            </F>
            <F label="Lieu" error={fields.location}>
              <input
                className="field"
                required
                value={v.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Dakar, Sénégal · ou Télétravail (Afrique)"
              />
            </F>
            <F label="Pays (code ISO)" error={fields.country} hint="facultatif, ex. SN, CI, NG">
              <input
                className="field uppercase"
                maxLength={2}
                value={v.country ?? ''}
                onChange={(e) => set('country', opt(e.target.value.toUpperCase()))}
              />
            </F>
            <F label="Contrat">
              <select
                className="field"
                value={v.contract}
                onChange={(e) => set('contract', e.target.value as JobOfferInput['contract'])}
              >
                {CONTRACTS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </F>
            <F label="Mode de travail">
              <select
                className="field"
                value={v.workMode}
                onChange={(e) => set('workMode', e.target.value as JobOfferInput['workMode'])}
              >
                {MODES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </F>
            <F label="Niveau">
              <select
                className="field"
                value={v.seniority}
                onChange={(e) => set('seniority', e.target.value as JobOfferInput['seniority'])}
              >
                {LEVELS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </F>
            <F label="Rémunération" error={fields.salary} hint="facultatif, telle qu’annoncée">
              <input
                className="field"
                value={v.salary ?? ''}
                onChange={(e) => set('salary', opt(e.target.value))}
                placeholder="800 000 – 1 200 000 FCFA / mois"
              />
            </F>
            <F
              label="Description"
              error={fields.description}
              hint="40 caractères minimum ; missions, profil, avantages"
              wide
            >
              <textarea
                className="field"
                rows={9}
                required
                value={v.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </F>
            <F label="Lien pour postuler" error={fields.applyUrl} hint="https:// ou mailto:" wide>
              <input
                className="field"
                required
                value={v.applyUrl}
                onChange={(e) => set('applyUrl', e.target.value)}
              />
            </F>
            <F
              label="Source officielle de l’offre"
              error={fields.sourceUrl}
              hint="page carrière ou annonce officielle, https://"
              wide
            >
              <input
                className="field"
                type="url"
                required
                value={v.sourceUrl}
                onChange={(e) => set('sourceUrl', e.target.value)}
              />
            </F>
            <F label="Compétences" error={fields.tags} hint="séparées par des virgules" wide>
              <input
                className="field"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Node.js, PostgreSQL, Docker"
              />
            </F>
            <F label="Date d’expiration" error={fields.expiresAt} hint="facultatif">
              <input
                className="field"
                type="date"
                value={v.expiresAt ? v.expiresAt.slice(0, 10) : ''}
                onChange={(e) =>
                  set(
                    'expiresAt',
                    e.target.value ? new Date(`${e.target.value}T23:59:59Z`).toISOString() : null,
                  )
                }
              />
            </F>
            <F label="Statut">
              <select
                className="field"
                value={v.status}
                onChange={(e) => set('status', e.target.value as JobOfferInput['status'])}
              >
                <option value="draft">Brouillon (invisible)</option>
                <option value="published">Publiée</option>
                <option value="archived">Archivée</option>
              </select>
            </F>
          </div>
          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">
              {error}
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function F({
  label,
  hint,
  error,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-[13px] font-semibold">
        {label}
        {hint && <span className="ml-1.5 font-normal text-muted">{hint}</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error && <span className="mt-1 block text-[12.5px] text-bad">{error}</span>}
    </label>
  );
}
