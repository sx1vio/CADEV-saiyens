import { BadgeCheck } from 'lucide-react';
import { Link } from 'react-router';
import { useQuery } from '@/lib/query';
import { labelsApi } from '@/platform/labels-api';

/** Applications « DevHub Ready » d'un dev : la preuve qu'il livre des apps qui tiennent. */
export function ReadyApps({ handle }: { handle: string }) {
  const { data } = useQuery(`labels:owner:${handle}`, () => labelsApi.byOwner(handle));
  const ready = (data?.items ?? []).filter((l) => l.status === 'ready');
  if (!ready.length) return null;
  return (
    <section className="dh-panel p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-medium text-fg">
        <BadgeCheck className="size-4 text-success" /> Applications DevHub Ready
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        En ligne, domaine prouvé, verdict de recette GO au pré-vol.
      </p>
      <ul className="mt-3 grid gap-2 md:grid-cols-2">
        {ready.map((l) => (
          <li key={l.domain}>
            <Link
              to={`/label/${l.domain}`}
              className="flex items-center gap-3 rounded-[10px] border border-line p-3 transition-colors hover:border-line-strong"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success [&_svg]:size-4.5">
                <BadgeCheck />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-fg">{l.domain}</span>
                <span className="block text-[12.5px] text-muted">
                  recette {l.recetteScore}/100 · vérifié le{' '}
                  {new Date(l.checkedAt).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
