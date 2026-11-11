import {
  ADMIN_NEWS_CATEGORIES,
  type AdminNewsInput,
  type AdminNewsItem,
  type AdminNewsKind,
} from '@devhub/contracts';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { Badge, Chips, Empty, PageHeader, SearchBox, when } from '../ui/kit';

/* Contenus de la plateforme (11/11/2026) : actualités, vidéos, skills IA, dépôts, versions,
   certifications et offres collectés. Ajout par lien, modification, retrait, remise en ligne. */

/** Images externes par le proxy de l'API : la CSP de l'administration n'autorise que 'self'. */
const proxied = (src: string, w: number) => `/api/v1/img?w=${w}&u=${encodeURIComponent(src)}`;

const KINDS: { id: AdminNewsKind; label: string }[] = [
  { id: 'article', label: 'Actualité' },
  { id: 'video', label: 'Vidéo' },
  { id: 'skill', label: 'Skill IA' },
  { id: 'repo', label: 'Dépôt' },
  { id: 'release', label: 'Version' },
  { id: 'cert', label: 'Certification' },
  { id: 'job', label: 'Offre' },
  { id: 'hn', label: 'Hacker News' },
  { id: 'devto', label: 'DEV' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<
  AdminNewsKind,
  string
>;
const CATEGORY_LABEL: Record<string, string> = {
  ia: 'IA',
  dev: 'Dev',
  tech: 'Tech',
  mobile: 'Mobile',
  cloud: 'Cloud',
  securite: 'Sécurité',
  afrique: 'Afrique',
  apple: 'Apple',
  google: 'Google',
  samsung: 'Samsung',
};

type KindFilter = 'all' | AdminNewsKind;
type StateFilter = 'all' | 'visible' | 'hidden' | 'curated';

const blank = (url = ''): AdminNewsInput => ({
  url,
  kind: 'article',
  category: 'dev',
  lang: 'fr',
  title: '',
  summary: '',
  image: null,
  sourceName: '',
  publishedAt: null,
});

const fromItem = (n: AdminNewsItem): AdminNewsInput => ({
  url: n.url,
  kind: n.kind,
  category: n.category,
  lang: n.lang,
  title: n.title,
  summary: n.summary,
  image: n.image,
  sourceName: n.sourceName,
  publishedAt: null,
});

export function Editorial({ onError }: { onError: (e: unknown) => void }) {
  const [kind, setKind] = useState<KindFilter>('all');
  const [state, setState] = useState<StateFilter>('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminNewsItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [link, setLink] = useState('');
  const [reading, setReading] = useState(false);
  const [edit, setEdit] = useState<{
    id: string | null;
    v: AdminNewsInput;
    replaces?: boolean;
  } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (offset = 0) =>
      api
        .news({ kind: kind === 'all' ? undefined : kind, state, q: q.trim() || undefined, offset })
        .then((r) => {
          setTotal(r.total);
          setRows((prev) => (offset ? [...(prev ?? []), ...r.data] : r.data));
        }, onError),
    [kind, state, q, onError],
  );
  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const read = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setReading(true);
    try {
      const p = await api.newsPreview(link.trim());
      setEdit({
        id: null,
        replaces: !!p.existingId,
        v: {
          ...blank(p.url),
          title: p.title,
          summary: p.summary,
          image: p.image,
          sourceName: p.sourceName,
          lang: p.lang,
          publishedAt: p.publishedAt,
        },
      });
    } catch (e2) {
      // Page illisible (protégée, hors ligne) : on remplit à la main.
      setErr(`${errorMessage(e2)} : remplis les champs à la main.`);
      setEdit({ id: null, v: blank(link.trim()) });
    } finally {
      setReading(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setErr('');
    setBusy(true);
    try {
      if (edit.id) await api.updateNews(edit.id, edit.v);
      else await api.createNews(edit.v);
      setEdit(null);
      setLink('');
      void load();
    } catch (e2) {
      onError(e2);
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    await fn().catch(onError);
    void load();
  };
  const set = <K extends keyof AdminNewsInput>(k: K, v: AdminNewsInput[K]) =>
    setEdit((p) => (p ? { ...p, v: { ...p.v, [k]: v } } : p));

  return (
    <section>
      <PageHeader title="Actus, skills et vidéos">
        Tout ce que montrent le fil, l’actualité, les skills IA et les certifications. Ajoute un
        contenu à partir de son lien, corrige-le, retire-le ou remets-le en ligne. Un contenu
        modifié ici n’est plus réécrit par la collecte, un contenu retiré ne revient pas. Visible
        sur le site en 3 minutes au plus.
      </PageHeader>

      {!edit && (
        <form
          onSubmit={read}
          className="flex max-w-[720px] flex-wrap gap-2 rounded-xl border border-line bg-panel p-4"
        >
          <input
            type="url"
            required
            className="field min-w-[240px] flex-1"
            placeholder="https://… (article, vidéo, dépôt GitHub, skill, certification)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            aria-label="Lien du contenu à ajouter"
          />
          <button type="submit" className="btn-primary" disabled={reading}>
            {reading ? 'Lecture…' : 'Lire la page'}
          </button>
          {err && <p className="w-full text-[13px] text-bad">{err}</p>}
        </form>
      )}

      {edit && (
        <form
          onSubmit={save}
          className="grid max-w-[860px] gap-4 rounded-xl border border-line bg-panel p-5 sm:grid-cols-[1fr_220px]"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="text-[13px] font-semibold">Lien</span>
              <input
                type="url"
                required
                className="field mt-1.5"
                value={edit.v.url}
                onChange={(e) => set('url', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Type</span>
              <select
                className="field mt-1.5"
                value={edit.v.kind}
                onChange={(e) => set('kind', e.target.value as AdminNewsKind)}
              >
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Rubrique</span>
              <select
                className="field mt-1.5"
                value={edit.v.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {[...new Set([...ADMIN_NEWS_CATEGORIES, edit.v.category])].map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c] ?? c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Langue</span>
              <select
                className="field mt-1.5"
                value={edit.v.lang}
                onChange={(e) => set('lang', e.target.value as 'fr' | 'en')}
              >
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
              </select>
            </label>
            <label className="block sm:col-span-3">
              <span className="text-[13px] font-semibold">Titre</span>
              <input
                required
                minLength={3}
                maxLength={400}
                className="field mt-1.5"
                value={edit.v.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="text-[13px] font-semibold">Résumé</span>
              <textarea
                rows={3}
                maxLength={2000}
                className="field mt-1.5"
                value={edit.v.summary}
                onChange={(e) => set('summary', e.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[13px] font-semibold">Image (https://, facultative)</span>
              <input
                type="url"
                className="field mt-1.5"
                value={edit.v.image ?? ''}
                onChange={(e) => set('image', e.target.value || null)}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold">Source affichée</span>
              <input
                required
                maxLength={80}
                className="field mt-1.5"
                value={edit.v.sourceName}
                onChange={(e) => set('sourceName', e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Aperçu</span>
            {edit.v.image ? (
              <img
                src={proxied(edit.v.image, 480)}
                alt=""
                className="aspect-[1.91/1] w-full rounded-lg border border-line object-cover"
              />
            ) : (
              <div className="grid aspect-[1.91/1] place-items-center rounded-lg border border-dashed border-line text-[12px] text-muted">
                sans image
              </div>
            )}
            <p className="line-clamp-3 text-[14px] font-semibold">{edit.v.title || 'Titre'}</p>
            <p className="text-[12px] text-muted">
              {edit.v.sourceName || 'Source'} · {KIND_LABEL[edit.v.kind]}
            </p>
            {edit.replaces && (
              <p className="rounded-lg bg-warn-soft px-2.5 py-1.5 text-[12px] text-warn">
                Ce lien est déjà sur DevHub : l’enregistrer remplace le contenu collecté.
              </p>
            )}
          </div>
          {err && (
            <p
              role="alert"
              className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad sm:col-span-2"
            >
              {err}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {edit.id ? 'Enregistrer' : 'Publier sur DevHub'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEdit(null);
                setErr('');
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Chips<KindFilter>
          value={kind}
          onChange={setKind}
          options={[{ id: 'all', label: 'Tout' }, ...KINDS.slice(0, 7)]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Chips<StateFilter>
            value={state}
            onChange={setState}
            options={[
              { id: 'all', label: 'Tous' },
              { id: 'visible', label: 'En ligne' },
              { id: 'hidden', label: 'Retirés' },
              { id: 'curated', label: 'Ajoutés ou modifiés ici' },
            ]}
          />
          <SearchBox value={q} onChange={setQ} placeholder="Titre, lien ou source" />
        </div>
        <p className="text-[13px] text-muted">{total} contenu(s)</p>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {rows?.length === 0 && <Empty>Aucun contenu pour ce filtre.</Empty>}
        {rows?.map((n) => (
          <li
            key={n.id}
            className={`flex gap-3 rounded-xl border border-line bg-panel p-3 ${n.hidden ? 'opacity-60' : ''}`}
          >
            {n.image ? (
              <img
                src={proxied(n.image, 240)}
                alt=""
                loading="lazy"
                className="hidden h-[68px] w-[120px] shrink-0 rounded-lg object-cover sm:block"
              />
            ) : (
              <div className="hidden h-[68px] w-[120px] shrink-0 rounded-lg bg-page sm:block" />
            )}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5">
                <Badge tone="brand">{KIND_LABEL[n.kind] ?? n.kind}</Badge>
                {n.hidden && <Badge tone="bad">Retiré</Badge>}
                {n.curated && <Badge tone="good">Modifié ici</Badge>}
              </p>
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 line-clamp-2 block text-[14.5px] font-semibold hover:underline"
              >
                {n.title}
              </a>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {n.sourceName} · {CATEGORY_LABEL[n.category] ?? n.category} · {n.lang.toUpperCase()}{' '}
                · {when(n.publishedAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost h-8"
                  onClick={() => {
                    setErr('');
                    setEdit({ id: n.id, v: fromItem(n) });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Modifier
                </button>
                {n.hidden ? (
                  <button
                    type="button"
                    className="btn-ghost h-8"
                    onClick={() => void act(() => api.restoreNews(n.id))}
                  >
                    Remettre en ligne
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost h-8"
                    onClick={() => void act(() => api.hideNews(n.id))}
                  >
                    Retirer
                  </button>
                )}
                {n.source === 'devhub' && (
                  <button
                    type="button"
                    className="btn-danger h-8"
                    onClick={() => {
                      if (confirm('Supprimer définitivement ce contenu ?'))
                        void act(() => api.deleteNews(n.id));
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {rows && rows.length < total && (
        <button type="button" className="btn-ghost mt-3" onClick={() => void load(rows.length)}>
          Voir plus
        </button>
      )}
    </section>
  );
}
