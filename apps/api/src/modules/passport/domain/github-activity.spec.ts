import { describe, expect, it } from 'vitest';
import {
  type RawEvent,
  type RawRepo,
  buildActivity,
  calendar,
  eventItem,
  pushCommits,
  topRepos,
} from './github-activity';

const now = new Date('2026-11-04T12:00:00Z');
const repo = (over: Partial<RawRepo>): RawRepo => ({
  name: 'r',
  full_name: 'ama/r',
  description: null,
  language: 'TypeScript',
  stargazers_count: 0,
  forks_count: 0,
  pushed_at: '2026-11-01T10:00:00Z',
  html_url: 'https://github.com/ama/r',
  homepage: null,
  fork: false,
  ...over,
});
const ev = (type: string, created_at: string, payload: RawEvent['payload'] = {}): RawEvent => ({
  type,
  created_at,
  repo: { name: 'ama/pay' },
  payload,
});

describe('activité GitHub du Passport', () => {
  it('met en avant les sources publiques les plus étoilées, sans fork ni archive en tête', () => {
    const r = topRepos([
      repo({ name: 'fork', fork: true, stargazers_count: 99 }),
      repo({ name: 'prive', private: true, stargazers_count: 50 }),
      repo({ name: 'archive', archived: true, stargazers_count: 40 }),
      repo({ name: 'pay', stargazers_count: 12, homepage: 'javascript:alert(1)' }),
      repo({ name: 'cli', stargazers_count: 3, homepage: 'https://cli.dev', topics: ['a', 'b'] }),
    ]);
    expect(r.map((x) => x.name)).toEqual(['pay', 'cli', 'archive']);
    expect(r[0]!.homepage).toBeNull();
    expect(r[1]).toMatchObject({ homepage: 'https://cli.dev', topics: ['a', 'b'] });
  });

  it('compte les commits d’un push avec size, la liste ou 1 à défaut', () => {
    expect(pushCommits(ev('PushEvent', now.toISOString(), { size: 4 }))).toBe(4);
    expect(pushCommits(ev('PushEvent', now.toISOString(), { commits: [1, 2] }))).toBe(2);
    expect(pushCommits(ev('PushEvent', now.toISOString()))).toBe(1);
  });

  it('décrit chaque type d’événement utile et ignore les autres', () => {
    const t = '2026-11-03T09:00:00Z';
    expect(eventItem(ev('PushEvent', t, { size: 1, ref: 'refs/heads/main' }))?.label).toBe(
      '1 commit poussé sur main',
    );
    expect(
      eventItem(
        ev('PullRequestEvent', t, {
          action: 'closed',
          pull_request: { title: 'Paiement', merged: true },
        }),
      )?.label,
    ).toBe('Pull request fusionnée : Paiement');
    expect(
      eventItem(ev('PullRequestEvent', t, { action: 'opened', pull_request: { title: 'X' } }))
        ?.kind,
    ).toBe('pr');
    expect(
      eventItem(ev('PullRequestEvent', t, { action: 'closed', pull_request: {} }))?.label,
    ).toBe('Pull request fermée :');
    expect(eventItem(ev('PullRequestEvent', t, { action: 'labeled' }))).toBeNull();
    expect(
      eventItem(ev('IssuesEvent', t, { action: 'opened', issue: { title: 'Bug' } }))?.label,
    ).toBe('Issue ouverte : Bug');
    expect(eventItem(ev('IssuesEvent', t, { action: 'closed' }))?.label).toBe('Issue fermée :');
    expect(eventItem(ev('IssuesEvent', t, { action: 'reopened' }))).toBeNull();
    expect(eventItem(ev('ReleaseEvent', t, { release: { tag_name: 'v1.0.0' } }))?.label).toBe(
      'Version publiée : v1.0.0',
    );
    expect(eventItem(ev('CreateEvent', t, { ref_type: 'repository' }))?.kind).toBe('create');
    expect(eventItem(ev('CreateEvent', t, { ref_type: 'branch' }))).toBeNull();
    expect(eventItem(ev('PullRequestReviewEvent', t))?.kind).toBe('review');
    expect(eventItem(ev('ForkEvent', t))?.kind).toBe('fork');
    expect(eventItem(ev('WatchEvent', t))?.kind).toBe('star');
    expect(eventItem(ev('GollumEvent', t))).toBeNull();
  });

  it('construit un calendrier de 91 jours qui finit aujourd’hui', () => {
    const c = calendar(
      [
        ev('PushEvent', '2026-11-04T08:00:00Z', { size: 3 }),
        ev('WatchEvent', '2026-11-04T09:00:00Z'),
      ],
      now,
    );
    expect(c).toHaveLength(91);
    expect(c.at(-1)).toEqual({ date: '2026-11-04', count: 4 });
    expect(c[0]!.date).toBe('2026-08-06');
  });

  it('assemble la vue : totaux, langages, événements récents seulement, commits triés', () => {
    const v = buildActivity({
      now,
      user: {
        login: 'ama',
        html_url: 'https://github.com/ama',
        followers: 10,
        following: 2,
        public_repos: 3,
        created_at: '2020-01-01T00:00:00Z',
      },
      repos: [
        repo({ name: 'pay', stargazers_count: 5, forks_count: 1 }),
        repo({ name: 'cli', language: 'Go', stargazers_count: 2 }),
        repo({ name: 'f', fork: true, stargazers_count: 100 }),
      ],
      events: [
        ev('PushEvent', '2026-11-03T10:00:00Z', { size: 2 }),
        ev('PushEvent', '2026-01-01T10:00:00Z', { size: 9 }), // plus de 90 jours
        ev('PushEvent', '2026-11-02T10:00:00Z', { size: 1 }),
      ],
      commits: [
        {
          repo: 'ama/pay',
          commits: [
            {
              sha: 'abcdef123',
              html_url: 'u1',
              commit: { message: 'feat: momo\n\ncorps', author: { date: '2026-11-01T00:00:00Z' } },
            },
            { sha: 'zzz', html_url: 'u0', commit: { message: 'x', author: null } },
          ],
        },
        {
          repo: 'ama/cli',
          commits: [
            {
              sha: '1234567aa',
              html_url: 'u2',
              commit: { message: 'fix', author: { date: '2026-11-03T00:00:00Z' } },
            },
          ],
        },
      ],
    });
    expect(v.totals).toEqual({ stars: 7, forks: 1, events90d: 2, commits90d: 3 });
    expect(v.languages).toEqual([
      { name: 'TypeScript', repos: 1 },
      { name: 'Go', repos: 1 },
    ]);
    expect(v.commits.map((c) => [c.sha, c.message])).toEqual([
      ['1234567', 'fix'],
      ['abcdef1', 'feat: momo'],
    ]);
    expect(v.events).toHaveLength(2);
    expect(v.profile).toMatchObject({ login: 'ama', since: '2020-01-01T00:00:00.000Z' });
  });
});
