// Activité GitHub publique d'un membre (Passport). Fonctions pures : les réponses brutes de
// l'API REST GitHub entrent, la vue du Passport sort. Aucune donnée privée n'est lue.
import type {
  GithubActivityView,
  GithubCommitItem,
  GithubEventItem,
  GithubRepoCard,
} from '@devhub/contracts';

export interface RawUser {
  login: string;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}
export interface RawRepo {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  html_url: string;
  homepage: string | null;
  topics?: string[];
  fork: boolean;
  archived?: boolean;
  private?: boolean;
}
export interface RawEvent {
  type: string;
  created_at: string;
  public?: boolean;
  repo: { name: string };
  payload: {
    action?: string;
    size?: number;
    commits?: unknown[];
    ref_type?: string;
    ref?: string | null;
    pull_request?: { title?: string; html_url?: string; merged?: boolean };
    issue?: { title?: string; html_url?: string };
    release?: { name?: string | null; tag_name?: string; html_url?: string };
    review?: { html_url?: string };
    forkee?: { html_url?: string };
  };
}
export interface RawCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { date: string } | null };
}

const DAY = 86_400_000;
export const CALENDAR_DAYS = 91;
const repoUrl = (full: string) => `https://github.com/${full}`;
const iso = (s: string) => new Date(s).toISOString();

/** Dépôts mis en avant : sources (pas de fork), publics, les plus étoilés puis les plus récents. */
export function topRepos(repos: RawRepo[], n = 6): GithubRepoCard[] {
  return repos
    .filter((r) => !r.fork && !r.private)
    .sort(
      (a, b) =>
        Number(a.archived ?? false) - Number(b.archived ?? false) ||
        b.stargazers_count - a.stargazers_count ||
        (b.pushed_at ?? '').localeCompare(a.pushed_at ?? ''),
    )
    .slice(0, n)
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      pushedAt: r.pushed_at ? iso(r.pushed_at) : null,
      url: r.html_url,
      homepage: r.homepage && /^https?:\/\//.test(r.homepage) ? r.homepage : null,
      topics: (r.topics ?? []).slice(0, 5),
    }));
}

/** Nombre de commits d'un push : `size` si GitHub le fournit, sinon la liste, sinon 1. */
export const pushCommits = (e: RawEvent) =>
  typeof e.payload.size === 'number'
    ? e.payload.size
    : Array.isArray(e.payload.commits)
      ? e.payload.commits.length
      : 1;

/** Une ligne lisible par événement public ; null pour les événements sans intérêt ici. */
export function eventItem(e: RawEvent): GithubEventItem | null {
  const at = iso(e.created_at);
  const repo = e.repo.name;
  const p = e.payload;
  switch (e.type) {
    case 'PushEvent': {
      const n = pushCommits(e);
      const branch = p.ref?.replace('refs/heads/', '');
      return {
        kind: 'push',
        repo,
        label: `${n} commit${n > 1 ? 's' : ''} poussé${n > 1 ? 's' : ''}${branch ? ` sur ${branch}` : ''}`,
        url: repoUrl(repo),
        at,
      };
    }
    case 'PullRequestEvent':
      if (p.action !== 'opened' && p.action !== 'closed') return null;
      return {
        kind: 'pr',
        repo,
        label:
          `${p.action === 'opened' ? 'Pull request ouverte' : p.pull_request?.merged ? 'Pull request fusionnée' : 'Pull request fermée'} : ${p.pull_request?.title ?? ''}`.trim(),
        url: p.pull_request?.html_url ?? repoUrl(repo),
        at,
      };
    case 'PullRequestReviewEvent':
      return {
        kind: 'review',
        repo,
        label: 'Revue de code',
        url: p.review?.html_url ?? repoUrl(repo),
        at,
      };
    case 'IssuesEvent':
      if (p.action !== 'opened' && p.action !== 'closed') return null;
      return {
        kind: 'issue',
        repo,
        label:
          `Issue ${p.action === 'opened' ? 'ouverte' : 'fermée'} : ${p.issue?.title ?? ''}`.trim(),
        url: p.issue?.html_url ?? repoUrl(repo),
        at,
      };
    case 'ReleaseEvent':
      return {
        kind: 'release',
        repo,
        label: `Version publiée : ${p.release?.name || p.release?.tag_name || ''}`.trim(),
        url: p.release?.html_url ?? repoUrl(repo),
        at,
      };
    case 'CreateEvent':
      if (p.ref_type !== 'repository') return null;
      return { kind: 'create', repo, label: 'Nouveau dépôt', url: repoUrl(repo), at };
    case 'ForkEvent':
      return { kind: 'fork', repo, label: 'Fork', url: p.forkee?.html_url ?? repoUrl(repo), at };
    case 'WatchEvent':
      return { kind: 'star', repo, label: 'Étoile ajoutée', url: repoUrl(repo), at };
    default:
      return null;
  }
}

/** Calendrier des 91 derniers jours (UTC), du plus ancien au plus récent. */
export function calendar(events: RawEvent[], now: Date): { date: string; count: number }[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const counts = new Map<string, number>();
  for (const e of events) {
    const d = e.created_at.slice(0, 10);
    counts.set(d, (counts.get(d) ?? 0) + (e.type === 'PushEvent' ? pushCommits(e) : 1));
  }
  return Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const date = new Date(end - (CALENDAR_DAYS - 1 - i) * DAY).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });
}

export function recentCommits(
  byRepo: { repo: string; commits: RawCommit[] }[],
  n = 8,
): GithubCommitItem[] {
  return byRepo
    .flatMap(({ repo, commits }) =>
      commits
        .filter((c) => c.commit.author?.date)
        .map((c) => ({
          repo,
          sha: c.sha.slice(0, 7),
          message: (c.commit.message.split('\n')[0] ?? '').slice(0, 140),
          url: c.html_url,
          at: iso(c.commit.author!.date),
        })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, n);
}

export function buildActivity(input: {
  user: RawUser;
  repos: RawRepo[];
  events: RawEvent[];
  commits: { repo: string; commits: RawCommit[] }[];
  now: Date;
}): GithubActivityView {
  const { user, now } = input;
  const owned = input.repos.filter((r) => !r.fork && !r.private);
  const since = now.getTime() - 90 * DAY;
  const events = input.events.filter(
    (e) => e.public !== false && new Date(e.created_at).getTime() >= since,
  );
  const langs = new Map<string, number>();
  for (const r of owned) if (r.language) langs.set(r.language, (langs.get(r.language) ?? 0) + 1);
  return {
    profile: {
      login: user.login,
      url: user.html_url,
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      since: iso(user.created_at),
    },
    totals: {
      stars: owned.reduce((n, r) => n + r.stargazers_count, 0),
      forks: owned.reduce((n, r) => n + r.forks_count, 0),
      events90d: events.length,
      commits90d: events
        .filter((e) => e.type === 'PushEvent')
        .reduce((n, e) => n + pushCommits(e), 0),
    },
    languages: [...langs]
      .map(([name, repos]) => ({ name, repos }))
      .sort((a, b) => b.repos - a.repos)
      .slice(0, 8),
    repos: topRepos(owned),
    commits: recentCommits(input.commits),
    events: events
      .map(eventItem)
      .filter((e): e is GithubEventItem => e !== null)
      .slice(0, 15),
    calendar: calendar(events, now),
    fetchedAt: now.toISOString(),
  };
}
