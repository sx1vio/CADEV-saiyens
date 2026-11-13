import type {
  ApplicationStatus,
  ApplicationView,
  BusinessJobInput,
  BusinessJobView,
  BusinessMeView,
} from '@devhub/contracts';
import { ArrowLeft, Code2, ExternalLink, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { ApiError, SITE_URL, api, errorMessage } from '../api';
import { StatusBanner } from '../App';

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
const JOB_STATUS: Record<BusinessJobView['status'], string> = {
  draft: 'Brouillon',
  published: 'En ligne',
  archived: 'Archivée',
};
export const APP_STATUS: Record<ApplicationStatus, { label: string; tone: string }> = {
  submitted: { label: 'Nouvelle', tone: 'bg-brand-soft text-brand' },
  seen: { label: 'Consultée', tone: 'bg-page text-muted' },
  interview: { label: 'Entretien', tone: 'bg-warn-soft text-warn' },
  rejected: { label: 'Non retenue', tone: 'bg-bad-soft text-bad' },
  hired: { label: 'Recrutée', tone: 'bg-good-soft text-good' },
  withdrawn: { label: 'Retirée', tone: 'bg-page text-muted' },
};

const EMPTY: BusinessJobInput = {
  title: '',
  location: '',
  country: null,
  workMode: 'hybrid',
  contract: 'cdi',
  seniority: 'confirme',
  salary: null,
  description: '',
  tags: [],
  expiresAt: null,
  status: 'draft',
};

const toInput = (j: BusinessJobView): BusinessJobInput => ({
  title: j.title,
  location: j.location,
  country: j.country,
  workMode: j.workMode,
  contract: j.contract,
  seniority: j.seniority,
  salary: j.salary,
  description: j.description,
  tags: j.tags,
  expiresAt: j.expiresAt,
  status: j.status,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function Jobs({ me, onError }: { me: BusinessMeView; onError: (e: unknown) => void }) {
  const [jobs, setJobs] = useState<BusinessJobView[] | null>(null);
  const [editing, setEditing] = useState<BusinessJobView | 'new' | null>(
    location.hash === '#offres/nouvelle' ? 'new' : null,
  );
  const [viewing, setViewing] = useState<BusinessJobView | null>(null);
  const load = useCallback(() => {
    api.jobs().then((r) => {
      setJobs(r.data);
      // Lien direct vers les candidatures d'une offre (#offres/<id>, depuis le tableau de bord).
      const id = /^#offres\/([0-9a-f-]{36})$/.exec(location.hash)?.[1];
      if (id) {
        const job = r.data.find((j) => j.id === id);
        if (job) setViewing(job);
        history.replaceState(null, '', '#offres');
      }
    }, onError);
  }, [onError]);
  useEffect(load, [load]);

  if (viewing)
    return (
      <Applications
        job={viewing}
        onBack={() => {
          setViewing(null);
          load();
        }}
        onError={onError}
      />
    );

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">Offres et candidatures</h1>
          <p className="mt-1 text-[14px] text-muted">
            Une offre « En ligne » apparaît sur DevHub Emplois ; les devs postulent avec leur
            Passport.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          <Plus className="size-4" />
          Nouvelle offre
        </button>
      </div>
      <div className="mt-5">
        <StatusBanner me={me} />
      </div>
      <ul className="flex flex-col gap-3">
        {jobs === null && <li className="text-muted">Chargement…</li>}
        {jobs?.length === 0 && (
          <li className="rounded-xl border border-dashed border-line bg-panel p-8 text-center text-muted">
            Aucune offre pour l’instant. Créez la première avec « Nouvelle offre ».
          </li>
        )}
        {jobs?.map((j) => (
          <li
            key={j.id}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{j.title}</p>
              <p className="text-[13px] text-muted">
                {j.location} · {JOB_STATUS[j.status]}
                {j.publishedAt && ` depuis le ${fmt(j.publishedAt)}`}
              </p>
            </div>
            <button type="button" onClick={() => setViewing(j)} className="btn-ghost h-9">
              <Users className="size-4" />
              {j.applications} candidature{j.applications > 1 ? 's' : ''}
              {j.newApplications > 0 && (
                <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                  {j.newApplications}
                </span>
              )}
            </button>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-page hover:text-ink"
              title="Modifier"
              onClick={() => setEditing(j)}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad"
              title="Supprimer"
              onClick={async () => {
                if (
                  !confirm(
                    `Supprimer « ${j.title} » et ses candidatures ? Préférez « Archivée » pour garder l’historique.`,
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
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <Editor
          job={editing === 'new' ? null : editing}
          verified={me.company.status === 'verified'}
          onClose={() => {
            setEditing(null);
            if (location.hash === '#offres/nouvelle') history.replaceState(null, '', '#offres');
          }}
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

function Editor({
  job,
  verified,
  onClose,
  onSaved,
  onError,
}: {
  job: BusinessJobView | null;
  verified: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError: (e: unknown) => void;
}) {
  const [v, setV] = useState<BusinessJobInput>(job ? toInput(job) : EMPTY);
  const [tags, setTags] = useState((job?.tags ?? []).join(', '));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof BusinessJobInput>(k: K, val: BusinessJobInput[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const body = {
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
      aria-labelledby="job-title"
    >
      <form
        onSubmit={save}
        className="flex h-full w-full max-w-[720px] flex-col bg-panel shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="job-title" className="text-[18px] font-bold">
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
            <F label="Lieu" error={fields.location}>
              <input
                className="field"
                required
                value={v.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Cotonou · ou Télétravail (Afrique de l’Ouest)"
              />
            </F>
            <F label="Pays (code ISO)" hint="facultatif">
              <input
                className="field uppercase"
                maxLength={2}
                value={v.country ?? ''}
                onChange={(e) => set('country', e.target.value.toUpperCase() || null)}
              />
            </F>
            <F label="Contrat">
              <select
                className="field"
                value={v.contract}
                onChange={(e) => set('contract', e.target.value as BusinessJobInput['contract'])}
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
                onChange={(e) => set('workMode', e.target.value as BusinessJobInput['workMode'])}
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
                onChange={(e) => set('seniority', e.target.value as BusinessJobInput['seniority'])}
              >
                {LEVELS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </F>
            <F label="Rémunération" hint="facultatif, recommandé">
              <input
                className="field"
                value={v.salary ?? ''}
                onChange={(e) => set('salary', e.target.value || null)}
                placeholder="600 000 – 900 000 FCFA / mois"
              />
            </F>
            <F
              label="Description"
              hint="80 caractères au moins : missions, profil, stack, avantages"
              error={fields.description}
              wide
            >
              <textarea
                className="field"
                rows={10}
                required
                value={v.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </F>
            <F label="Compétences recherchées" hint="séparées par des virgules" wide>
              <input
                className="field"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Node.js, PostgreSQL, Docker"
              />
            </F>
            <F label="Date limite" hint="facultatif">
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
                onChange={(e) => set('status', e.target.value as BusinessJobInput['status'])}
              >
                <option value="draft">Brouillon (invisible)</option>
                <option value="published" disabled={!verified}>
                  En ligne{verified ? '' : ' (après validation)'}
                </option>
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

function Applications({
  job,
  onBack,
  onError,
}: {
  job: BusinessJobView;
  onBack: () => void;
  onError: (e: unknown) => void;
}) {
  const [rows, setRows] = useState<ApplicationView[] | null>(null);
  const load = useCallback(() => {
    api.applications(job.id).then((r) => setRows(r.data), onError);
  }, [job.id, onError]);
  useEffect(load, [load]);

  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Toutes les offres
      </button>
      <h1 className="text-[22px] font-bold">{job.title}</h1>
      <p className="mt-1 text-[14px] text-muted">
        Le candidat est prévenu de chaque changement de statut (notification et e-mail), avec votre
        message s’il y en a un. Ouvrez son Passport pour voir ses preuves.
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {rows === null && <li className="text-muted">Chargement…</li>}
        {rows?.length === 0 && (
          <li className="rounded-xl border border-dashed border-line bg-panel p-8 text-center text-muted">
            Pas encore de candidature pour cette offre.
          </li>
        )}
        {rows?.map((a) => (
          <ApplicationCard key={a.id} a={a} onChanged={load} onError={onError} />
        ))}
      </ul>
    </section>
  );
}

const fmtSize = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(n / 1024))} Ko`;

/** Une candidature : Passport, message, contact partagé, CV, liens, décision avec un mot. */
function ApplicationCard({
  a,
  onChanged,
  onError,
}: {
  a: ApplicationView;
  onChanged: () => void;
  onError: (e: unknown) => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: 'seen' | 'interview' | 'rejected' | 'hired') => {
    setBusy(true);
    try {
      await api.setStatus(a.id, { status, ...(note.trim() ? { note: note.trim() } : {}) });
      setNote('');
      onChanged();
    } catch (e) {
      onError(e);
      alert(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start gap-3">
        {a.candidate.avatarUrl ? (
          <img src={a.candidate.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
        ) : (
          <span className="grid size-11 place-items-center rounded-full bg-brand-soft font-bold text-brand">
            {a.candidate.displayName.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {a.candidate.displayName}{' '}
            <span className="font-normal text-muted">@{a.candidate.handle}</span>
          </p>
          <p className="text-[13px] text-muted">
            {a.candidate.proofXp} Proof XP
            {a.candidate.country && ` · ${a.candidate.country}`}
            {a.candidate.githubLinked && (
              <span className="ml-1.5 inline-flex items-center gap-1">
                <Code2 className="size-3.5" /> GitHub relié
              </span>
            )}
            {' · '}postulé le {fmt(a.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${APP_STATUS[a.status].tone}`}
        >
          {APP_STATUS[a.status].label}
        </span>
      </div>
      {a.candidate.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {a.candidate.skills.map((s) => (
            <span key={s.label} className="rounded-md bg-page px-2 py-0.5 text-[12px] font-medium">
              {s.label} <span className="text-muted">{s.score}</span>
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 rounded-lg bg-page px-3 py-2 text-[14px] whitespace-pre-wrap">
        {a.message}
      </p>

      <dl className="mt-3 grid gap-1.5 text-[13.5px]">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted">E-mail :</dt>
          <dd>
            {a.contactEmail ? (
              <a
                href={`mailto:${a.contactEmail}`}
                className="font-medium text-brand hover:underline"
              >
                {a.contactEmail}
              </a>
            ) : (
              <span className="text-muted">
                non partagé (répondez par le changement de statut ci-dessous)
              </span>
            )}
          </dd>
        </div>
        {a.links.length > 0 && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted">Liens :</dt>
            <dd className="flex min-w-0 flex-wrap gap-x-3">
              {a.links.map((l) => (
                <a
                  key={l}
                  href={l}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="max-w-[320px] truncate font-medium text-brand hover:underline"
                >
                  {l.replace(/^https:\/\//, '')}
                </a>
              ))}
            </dd>
          </div>
        )}
        {a.note && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted">Dernier message envoyé :</dt>
            <dd className="whitespace-pre-wrap">{a.note}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`${SITE_URL}/u/${a.candidate.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost h-9"
        >
          Voir le Passport <ExternalLink className="size-4" />
        </a>
        {a.cv && (
          <button
            type="button"
            className="btn-ghost h-9"
            onClick={() => api.downloadCv(a.id, a.cv!.name).catch((e) => alert(errorMessage(e)))}
          >
            Télécharger le CV ({fmtSize(a.cv.size)})
          </button>
        )}
      </div>

      {a.status !== 'withdrawn' && (
        <div className="mt-4 border-t border-line pt-3">
          <label className="block text-[13px] font-medium text-muted" htmlFor={`note-${a.id}`}>
            Message au candidat (facultatif, envoyé avec votre décision)
          </label>
          <textarea
            id={`note-${a.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Ex. : entretien jeudi 10 h en visio, lien à suivre."
            className="mt-1.5 w-full rounded-lg border border-line bg-page px-3 py-2 text-[14px] outline-none focus:border-brand"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {a.status === 'submitted' && (
              <button
                type="button"
                disabled={busy}
                className="btn-ghost h-9"
                onClick={() => setStatus('seen')}
              >
                Marquer consultée
              </button>
            )}
            {a.status !== 'hired' && (
              <button
                type="button"
                disabled={busy}
                className="btn-ghost h-9"
                onClick={() => setStatus('interview')}
              >
                {a.status === 'interview' ? 'Envoyer le message' : 'Proposer un entretien'}
              </button>
            )}
            {a.status !== 'hired' && (
              <button
                type="button"
                disabled={busy}
                className="btn-primary h-9"
                onClick={() => setStatus('hired')}
              >
                Recruter
              </button>
            )}
            {a.status !== 'rejected' && a.status !== 'hired' && (
              <button
                type="button"
                disabled={busy}
                className="btn-danger h-9"
                onClick={() => setStatus('rejected')}
              >
                Ne pas retenir
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
