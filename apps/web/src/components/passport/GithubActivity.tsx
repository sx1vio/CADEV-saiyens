import type { GithubActivityView, GithubEventItem } from '@devhub/contracts';
import {
  BookMarked,
  CircleDot,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  GitFork,
  GitPullRequest,
  Package,
  Star,
  Eye,
} from 'lucide-react';
import { Heatmap } from '@/components/ui/data';
import { useQuery } from '@/lib/query';
import { BrandLogo, logoFor } from '@/platform/logos';
import { Ago } from '@/platform/ui';
import { GitHubIcon } from '@/components/icons';

const BASE = `${(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''}/api/v1`;

/** null : pas de GitHub relié, ou activité masquée par le membre. */
async function fetchActivity(handle: string): Promise<GithubActivityView | null> {
  const res = await fetch(`${BASE}/users/${encodeURIComponent(handle)}/github`, {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`github ${res.status}`);
  return (await res.json()) as GithubActivityView;
}

const EVENT_ICON: Record<GithubEventItem['kind'], typeof Star> = {
  push: GitCommitHorizontal,
  pr: GitPullRequest,
  review: Eye,
  issue: CircleDot,
  release: Package,
  create: BookMarked,
  fork: GitFork,
  star: Star,
};

const nf = new Intl.NumberFormat('fr-FR');

/** Activité GitHub publique du membre : dépôts, commits récents, 90 derniers jours. */
export function GithubActivity({ handle }: { handle: string }) {
  const { data, error } = useQuery(`github:${handle}`, () => fetchActivity(handle));
  if (data === null || (error && !data)) return null;
  if (!data) return <div className="dh-panel h-40 animate-pulse" aria-hidden="true" />;
  const g = data;
  return (
    <section aria-labelledby="gh-title" className="dh-panel p-5">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="gh-title" className="flex items-center gap-1.5 text-[15px] font-medium text-fg">
          <GitHubIcon className="size-4" />
          Sur GitHub
        </h2>
        <a
          href={g.profile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline"
        >
          @{g.profile.login}
          <ExternalLink className="size-3.5" />
        </a>
        <span className="ml-auto text-[12px] text-subtle">
          Données publiques · mises à jour <Ago iso={g.fetchedAt} />
        </span>
      </div>

      <div className="rounded-[10px] bg-surface-1 p-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Dépôts publics', g.profile.publicRepos],
            ['Étoiles reçues', g.totals.stars],
            ['Commits (90 j)', g.totals.commits90d],
            ['Abonnés', g.profile.followers],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-[12px] text-subtle">{label}</dt>
              <dd className="text-[20px] font-semibold tabular-nums text-fg">
                {nf.format(value as number)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-1 text-[12px] text-subtle">
          Sur GitHub depuis {new Date(g.profile.since).getFullYear()}
        </p>

        <div className="mt-4">
          <p className="mb-1.5 text-[12.5px] font-medium text-muted">
            Activité publique, 13 dernières semaines
          </p>
          <Heatmap days={g.calendar} />
        </div>

        {g.languages.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Langages des dépôts">
            {g.languages.map((l) => (
              <li
                key={l.name}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2 py-1 text-[12.5px] font-medium text-fg"
              >
                {logoFor(l.name) && <BrandLogo name={l.name} size={13} />}
                {l.name}
                <span className="text-subtle">{l.repos}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {g.repos.length > 0 && (
        <>
          <h3 className="mt-4 mb-2 text-[13px] font-medium text-muted">Dépôts mis en avant</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {g.repos.map((r) => (
              <li key={r.fullName}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-full flex-col rounded-[10px] bg-surface-1 p-3.5 transition-colors hover:bg-surface-2"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-accent-text">
                    <BookMarked className="size-4 shrink-0" />
                    <span className="truncate">{r.name}</span>
                  </span>
                  {r.description && (
                    <span className="mt-1 line-clamp-2 text-[13px] text-muted">
                      {r.description}
                    </span>
                  )}
                  <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[12px] text-subtle">
                    {r.language && <span className="font-medium text-fg">{r.language}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5" /> {r.stars}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GitFork className="size-3.5" /> {r.forks}
                    </span>
                    {r.pushedAt && (
                      <span>
                        mis à jour <Ago iso={r.pushedAt} />
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {g.commits.length > 0 && (
          <div className="rounded-[10px] bg-surface-1 p-4">
            <h3 className="mb-2 text-[13px] font-medium text-muted">Commits récents</h3>
            <ul className="flex flex-col gap-2">
              {g.commits.map((c) => (
                <li key={c.url} className="flex min-w-0 items-start gap-2 text-[13px]">
                  <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-subtle" />
                  <span className="min-w-0 flex-1">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-fg hover:text-accent-text"
                    >
                      {c.message}
                    </a>
                    <span className="text-[12px] text-subtle">
                      <code className="font-mono">{c.sha}</code> · {c.repo.split('/')[1]} ·{' '}
                      <Ago iso={c.at} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {g.events.length > 0 && (
          <div className="rounded-[10px] bg-surface-1 p-4">
            <h3 className="mb-2 text-[13px] font-medium text-muted">Activité récente</h3>
            <ul className="flex flex-col gap-2">
              {g.events.slice(0, 8).map((e, i) => {
                const Icon = EVENT_ICON[e.kind] ?? GitBranch;
                return (
                  <li key={`${e.at}-${i}`} className="flex min-w-0 items-start gap-2 text-[13px]">
                    <Icon className="mt-0.5 size-4 shrink-0 text-subtle" />
                    <span className="min-w-0 flex-1">
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-fg hover:text-accent-text"
                      >
                        {e.label}
                      </a>
                      <span className="text-[12px] text-subtle">
                        {e.repo} · <Ago iso={e.at} />
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
