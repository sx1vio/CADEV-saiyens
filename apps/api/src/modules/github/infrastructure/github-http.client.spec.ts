import { describe, expect, it, vi } from 'vitest';
import { parsePullUrl } from '../domain/ports';
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

describe('GithubHttpClient : dépôts, PR et issues (R1, R2, R9)', () => {
  it('lit le dépôt et les droits d’écriture du jeton ; 404 → null', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input).endsWith('/repos/awa/absent')
        ? json({}, 404)
        : json({
            full_name: 'awa/paylink',
            private: false,
            archived: false,
            description: null,
            html_url: 'https://github.com/awa/paylink',
            permissions: { admin: false, push: true, pull: true },
          }),
    );
    const client = new GithubHttpClient(fetchMock as typeof fetch);
    expect(await client.getRepo('t', 'awa/paylink')).toMatchObject({
      canPush: true,
      private: false,
    });
    expect(await client.getRepo('t', 'awa/absent')).toBeNull();
  });

  it('sans droits d’écriture (dépôt d’un autre) : canPush = false', async () => {
    const fetchMock = vi.fn(async () =>
      json({
        full_name: 'facebook/react',
        private: false,
        archived: false,
        description: null,
        html_url: 'x',
        permissions: { pull: true },
      }),
    );
    expect(
      await new GithubHttpClient(fetchMock as typeof fetch).getRepo('t', 'facebook/react'),
    ).toMatchObject({
      canPush: false,
    });
  });

  it('nom de dépôt invalide : aucun appel réseau', async () => {
    const fetchMock = vi.fn();
    const client = new GithubHttpClient(fetchMock as typeof fetch);
    expect(await client.getRepo('t', '../../user')).toBeNull();
    expect(await client.getPullRequest('t', 'a/b?x=1', 1)).toBeNull();
    expect(await client.listOpenIssues('t', 'pas un dépôt')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('PR : fusion et auteur ; issues : les pull requests sont exclues', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input).includes('/pulls/')
        ? json({ number: 7, merged: true, user: { id: 42, login: 'moussa' } })
        : json([
            { id: 1, number: 1, title: 'Bug', body: null, labels: [{ name: 'good first issue' }] },
            { id: 2, number: 2, title: 'PR', body: null, labels: [], pull_request: {} },
          ]),
    );
    const client = new GithubHttpClient(fetchMock as typeof fetch);
    expect(await client.getPullRequest('t', 'awa/paylink', 7)).toEqual({
      number: 7,
      merged: true,
      authorId: 42n,
      authorLogin: 'moussa',
    });
    expect(await client.listOpenIssues('t', 'awa/paylink', ['good first issue'])).toEqual([
      { id: 1n, number: 1, title: 'Bug', body: null, labels: ['good first issue'] },
    ]);
    expect(String(fetchMock.mock.calls[1]![0])).toContain('labels=good+first+issue');
  });
});

describe('parsePullUrl', () => {
  it('accepte seulement un lien de PR github.com', () => {
    expect(parsePullUrl('https://github.com/awa/paylink/pull/12')).toEqual({
      fullName: 'awa/paylink',
      number: 12,
    });
    expect(parsePullUrl('https://github.com/awa/paylink/pull/12/')).toEqual({
      fullName: 'awa/paylink',
      number: 12,
    });
    expect(parsePullUrl('https://evil.example/awa/paylink/pull/12')).toBeNull();
    expect(parsePullUrl('https://github.com/awa/paylink/issues/12')).toBeNull();
    expect(parsePullUrl('http://github.com/awa/paylink/pull/12')).toBeNull();
  });
});
