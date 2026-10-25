import { ExternalLink, Radio, RefreshCw, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
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
const SKILL_TYPES = [
  { id: '', label: 'Tout' },
  { id: 'skill', label: 'Skills' },
  { id: 'plugin', label: 'Plugins' },
  { id: 'mcp', label: 'Serveurs MCP' },
  { id: 'rules', label: 'Règles' },
];
const TOOL_NAME: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
};

export function LiveBoard({ kind, title }: { kind: 'job' | 'cert' | 'skill'; title: string }) {
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const { data, error, refreshing, refresh } = useQuery(`live:${kind}:${type}:${search}`, () =>
    fetchNews({
      kind,
      category: kind === 'skill' ? type : undefined,
      q: kind === 'skill' ? search : undefined,
      limit: kind === 'job' ? 40 : kind === 'cert' ? 60 : 100,
    }),
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
      {kind === 'skill' && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query.trim());
            }}
            className="flex h-10 flex-1 items-center gap-2 rounded-full border border-line-strong bg-canvas px-4"
          >
            <Search className="size-4 shrink-0 text-subtle" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un skill, un serveur MCP, un plugin…"
              aria-label="Chercher un skill, un serveur MCP, un plugin"
              className="w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-subtle"
            />
          </form>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {SKILL_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={type === t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[13px] font-medium',
                  type === t.id ? 'lg-tint' : 'lg-clear text-fg',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
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
      : item.kind === 'skill'
        ? [item.category, ...asList(x.tools).map((t) => TOOL_NAME[t] ?? t)]
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
        <h3
          className={cn(
            'text-[14px] leading-snug font-semibold text-fg break-words group-hover:underline',
            item.kind === 'skill' && 'font-mono',
          )}
        >
          {item.title}
          <ExternalLink className="ml-1 inline size-3 text-subtle" aria-hidden />
        </h3>
        {item.kind === 'job' && item.author && (
          <p className="mt-0.5 text-[13px] text-muted">{item.author}</p>
        )}
        {(item.kind === 'cert' || item.kind === 'skill') && item.summary && (
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
          {item.kind === 'skill' && item.score > 0 && (
            <>
              {' · '}
              <Star className="inline size-3" aria-hidden /> {item.score.toLocaleString('fr-FR')}
            </>
          )}
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
