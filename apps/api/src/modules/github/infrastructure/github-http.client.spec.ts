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
    expect(String(fetchMock.mock.calls[0]![0])).toContain('affiliation=owner');
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

  it('n’utilise jamais `type` avec `visibility` (GitHub répond 422)', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request) => json([]));
    await new GithubHttpClient(fetchMock as typeof fetch).listOwnedRepos('t');
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.has('type')).toBe(false);
    expect(url.searchParams.get('visibility')).toBe('public');
  });

  it('distingue un jeton révoqué d’un quota épuisé', async () => {
    const revoked = vi.fn(async () => json({}, 401));
    await expect(
      new GithubHttpClient(revoked as typeof fetch).repoLanguages('t', 'a/b'),
    ).rejects.toMatchObject({
      tokenRevoked: true,
      rateLimited: false,
    });

    const exhausted = vi.fn(
      async () =>
        new Response('{}', {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791300000' },
        }),
    );
    const err = (await new GithubHttpClient(exhausted as typeof fetch)
      .repoLanguages('t', 'a/b')
      .catch((e: unknown) => e)) as GithubApiError;
    expect(err.rateLimited).toBe(true);
    expect(err.tokenRevoked).toBe(false);
    expect(err.rateLimitResetAt?.getTime()).toBe(1791300000 * 1000);

    const forbidden = vi.fn(async () => json({}, 403));
    await expect(
      new GithubHttpClient(forbidden as typeof fetch).repoLanguages('t', 'a/b'),
    ).rejects.toMatchObject({
      rateLimited: false,
    });
  });
});
