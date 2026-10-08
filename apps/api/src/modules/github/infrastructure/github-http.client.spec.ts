import { describe, expect, it, vi } from 'vitest';
import { GithubApiError, GithubHttpClient } from './github-http.client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const raw = (i: number) => ({
  full_name: `awa/repo-${i}`,
  fork: false,
  size: 10,
  pushed_at: '2026-09-01T00:00:00Z',
  topics: ['docker'],
});

describe('GithubHttpClient', () => {
  it('lit les dépôts page par page jusqu’à une page incomplète', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const page = Number(new URL(String(input)).searchParams.get('page'));
      return json(page === 1 ? Array.from({ length: 100 }, (_, i) => raw(i)) : [raw(100)]);
    });
    const repos = await new GithubHttpClient(fetchMock as typeof fetch).listOwnedRepos('t');
    expect(repos).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(repos[0]).toMatchObject({
      fullName: 'awa/repo-0',
      fork: false,
      sizeKb: 10,
      topics: ['docker'],
    });
    expect(String(fetchMock.mock.calls[0]![0])).toContain('type=owner');
  });

  it('envoie le jeton de l’utilisateur', async () => {
    const fetchMock = vi.fn(async () => json({ TypeScript: 1000 }));
    await new GithubHttpClient(fetchMock as typeof fetch).repoLanguages('gho_x', 'awa/app');
    const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init[1].headers as Record<string, string>).Authorization).toBe('Bearer gho_x');
  });

  it('signale une erreur avec son statut', async () => {
    const fetchMock = vi.fn(async () => json({}, 403));
    await expect(
      new GithubHttpClient(fetchMock as typeof fetch).repoLanguages('t', 'a/b'),
    ).rejects.toMatchObject({
      status: 403,
    } satisfies Partial<GithubApiError>);
  });
});
