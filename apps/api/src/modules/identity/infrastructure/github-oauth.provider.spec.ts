import { describe, expect, it, vi } from 'vitest';
import { GithubOAuthError, GithubOAuthHttpProvider, pickEmail } from './github-oauth.provider';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GithubOAuthHttpProvider', () => {
  it('construit l’URL d’autorisation avec les scopes en lecture seule et PKCE', () => {
    const url = new URL(
      new GithubOAuthHttpProvider('cid', 'secret').authorizeUrl({
        state: 'st',
        codeChallenge: 'ch',
        redirectUri: 'https://api.test/cb',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'cid',
      redirect_uri: 'https://api.test/cb',
      scope: 'read:user user:email',
      state: 'st',
      code_challenge: 'ch',
      code_challenge_method: 'S256',
    });
  });

  it('échange le code puis lit le profil et l’e-mail', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/access_token')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          code: 'c0de',
          code_verifier: 'verif',
        });
        return json({ access_token: 'gho_x', scope: 'read:user,user:email' });
      }
      if (url.endsWith('/user')) {
        return json({
          id: 42,
          login: 'awa',
          name: 'Awa',
          avatar_url: 'https://a',
          created_at: '2019-01-02T00:00:00Z',
        });
      }
      return json([
        { email: 'old@x.test', primary: false, verified: true },
        { email: 'awa@x.test', primary: true, verified: true },
      ]);
    });
    const identity = await new GithubOAuthHttpProvider(
      'cid',
      'secret',
      fetchMock as typeof fetch,
    ).exchange('c0de', 'verif', 'https://api.test/cb');
    expect(identity).toMatchObject({
      githubId: 42n,
      login: 'awa',
      email: 'awa@x.test',
      accessToken: 'gho_x',
      scopes: ['read:user', 'user:email'],
    });
    expect(identity.createdAt.toISOString()).toBe('2019-01-02T00:00:00.000Z');
  });

  it('signale un code refusé par GitHub', async () => {
    const fetchMock = vi.fn(async () => json({ error: 'bad_verification_code' }));
    await expect(
      new GithubOAuthHttpProvider('cid', 'secret', fetchMock as typeof fetch).exchange(
        'x',
        'y',
        'z',
      ),
    ).rejects.toBeInstanceOf(GithubOAuthError);
  });

  it('signale une API GitHub en erreur', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input).endsWith('/access_token')
        ? json({ access_token: 't', scope: '' })
        : json({}, 503),
    );
    await expect(
      new GithubOAuthHttpProvider('cid', 'secret', fetchMock as typeof fetch).exchange(
        'x',
        'y',
        'z',
      ),
    ).rejects.toThrow(/503/);
  });
});

describe('pickEmail', () => {
  it('préfère l’e-mail principal vérifié', () => {
    expect(
      pickEmail([
        { email: 'a', primary: true, verified: false },
        { email: 'b', primary: false, verified: true },
      ]),
    ).toBe('b');
    expect(pickEmail([{ email: 'a', primary: true, verified: false }])).toBeNull();
    expect(pickEmail([])).toBeNull();
  });
});
