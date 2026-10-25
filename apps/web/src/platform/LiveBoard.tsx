import { ExternalLink, Radio, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { fetchNews, img, type NewsItem } from './news';
import { Ago } from './ui';

const REFRESH_MS = 5 * 60_000;

const asList = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

/**
 * Offres d'emploi et certifications collectées en direct chez des sources officielles
 * (apps/api, module news : Remotive, Jobicy, Microsoft Learn). L'API les renouvelle seule ;
 * ici on relit toutes les 5 minutes et au retour sur l'onglet.
 */
export function LiveBoard({ kind, title }: { kind: 'job' | 'cert'; title: string }) {
  const { data, error, refreshing, refresh } = useQuery(`live:${kind}`, () =>
    fetchNews({ kind, limit: kind === 'job' ? 40 : 60 }),
  );

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && void refresh().catch(() => {});
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh]);

  const sources = [...new Set((data ?? []).map((i) => i.sourceName))];

  return (
    <section aria-label={title} className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-fg">
          <Radio className="size-4 text-success" aria-hidden />
          {title}
        </h2>
        {sources.length > 0 && (
          <span className="text-[12.5px] text-subtle" title={sources.join(', ')}>
            {sources.length} sources officielles
          </span>
        )}
        {kind === 'job' && (
          // LinkedIn n'a pas d'API ouverte et interdit la collecte automatique : simple lien de recherche.
          <a
            href="https://www.linkedin.com/jobs/search/?keywords=developer&location=Africa&f_WT=2"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[12.5px] font-semibold text-fg"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Chercher sur LinkedIn
          </a>
        )}
        <button
          type="button"
          onClick={() => void refresh().catch(() => {})}
          className={cn(
            kind !== 'job' && 'ml-auto',
            'inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[12.5px] font-semibold text-fg',
          )}
        >
          <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} aria-hidden />
          Actualiser
        </button>
      </div>
      {!!error && !data && (
        <p className="rounded-[10px] bg-surface-1 p-5 text-muted">
          Impossible de charger les données en direct. Réessaie dans un instant.
        </p>
      )}
      {data?.length === 0 && (
        <p className="rounded-[10px] bg-surface-1 p-5 text-muted">
          Aucune donnée collectée pour l’instant. La première collecte démarre avec le worker.
        </p>
      )}
      <ul className="grid gap-2 md:grid-cols-2">
        {data?.map((it) => (
          <li key={it.id}>
            <LiveCard item={it} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LiveCard({ item }: { item: NewsItem }) {
  const x = item.extra;
  const tags =
    item.kind === 'job'
      ? [x.jobType, x.location, x.salary].filter((t): t is string => typeof t === 'string' && !!t)
      : [...asList(x.levels), ...asList(x.roles)];
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full gap-3 rounded-[10px] bg-surface-1 p-4 transition-colors hover:bg-surface-2"
    >
      {item.image ? (
        <img
          src={img(item.image, 96) ?? ''}
          alt=""
          loading="lazy"
          className="size-12 shrink-0 rounded-[8px] bg-canvas object-contain"
        />
      ) : (
        <span className="size-12 shrink-0 rounded-[8px] bg-canvas" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] leading-snug font-semibold text-fg group-hover:underline">
          {item.title}
          <ExternalLink className="ml-1 inline size-3 text-subtle" aria-hidden />
        </h3>
        {item.kind === 'job' && item.author && (
          <p className="mt-0.5 text-[13px] text-muted">{item.author}</p>
        )}
        {item.kind === 'cert' && item.summary && (
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{item.summary}</p>
        )}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-[6px] bg-surface-3 px-2 py-0.5 text-[12px] font-medium text-fg"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-[12px] text-subtle">
          {item.sourceName}
          {item.kind === 'job' && (
            <>
              {' · '}
              <Ago iso={item.publishedAt} />
            </>
          )}
        </p>
      </div>
    </a>
  );
}
