import type { AdminContentType, AdminContentView } from '@devhub/contracts';
import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SITE_URL, api, errorMessage } from '../api';
import { Badge, Chips, Empty, PageHeader, SearchBox, ago } from '../ui/kit';

const TYPES = [
  { id: 'post', label: 'Publications' },
  { id: 'post_comment', label: 'Commentaires' },
  { id: 'bench_request', label: 'Banc d’essai' },
  { id: 'question', label: 'Questions' },
  { id: 'answer', label: 'Réponses' },
  { id: 'room', label: 'Projets' },
  { id: 'room_message', label: 'Messages de projet' },
] as const;
const STATES = [
  { id: 'all', label: 'Tous' },
  { id: 'visible', label: 'Visibles' },
  { id: 'hidden', label: 'Masqués' },
] as const;

/** Tous les contenus publiés par les membres : chercher, masquer, rétablir. */
export function Content({ onError }: { onError: (e: unknown) => void }) {
  const [type, setType] = useState<AdminContentType>('post');
  const [state, setState] = useState<'all' | 'visible' | 'hidden'>('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminContentView[] | null>(null);

  const load = useCallback(() => {
    api.content({ type, state, q: q.trim() || undefined }).then((r) => setRows(r.data), onError);
  }, [type, state, q, onError]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const toggle = async (c: AdminContentView) => {
    const reason = prompt(
      c.hidden ? 'Pourquoi rétablir ce contenu ?' : 'Pourquoi masquer ce contenu ?',
    )?.trim();
    if (!reason || reason.length < 3) return;
    try {
      await api.contentAction(c.type, c.id, { action: c.hidden ? 'restore' : 'hide', reason });
      load();
    } catch (e) {
      onError(e);
      alert(errorMessage(e));
    }
  };

  return (
    <section>
      <PageHeader title="Contenus">
        Tout ce que les membres publient. Masquer retire le contenu du site sans le supprimer : il
        reste rétablissable, et l’action est journalisée.
      </PageHeader>
      <div className="flex flex-col gap-3">
        <Chips value={type} onChange={setType} options={TYPES} />
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Chercher dans le texte" />
          <Chips value={state} onChange={setState} options={STATES} />
        </div>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {!rows && <li className="text-muted">Chargement…</li>}
        {rows?.length === 0 && <Empty />}
        {rows?.map((c) => (
          <li
            key={c.id}
            className={`rounded-xl border border-line bg-panel p-4 ${c.hidden ? 'opacity-70' : ''}`}
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                {c.title && <p className="font-semibold">{c.title}</p>}
                <p className="mt-0.5 text-[14px] whitespace-pre-wrap">{c.excerpt}</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  {c.author ? `@${c.author.handle}` : 'auteur inconnu'} · {ago(c.createdAt)}
                </p>
              </div>
              {c.hidden && <Badge tone="bad">Masqué</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.path && (
                <a
                  href={`${SITE_URL}${c.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost h-9"
                >
                  Voir sur le site <ExternalLink className="size-4" />
                </a>
              )}
              <button
                type="button"
                className={c.hidden ? 'btn-ghost h-9' : 'btn-danger h-9'}
                onClick={() => toggle(c)}
              >
                {c.hidden ? 'Rétablir' : 'Masquer'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
