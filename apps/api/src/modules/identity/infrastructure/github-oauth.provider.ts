import { GITHUB_SCOPES, type GithubIdentity } from '../domain/github-identity';
import type { AuthorizeParams, GithubOAuthProvider } from '../domain/ports';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const API = 'https://api.github.com';
const TIMEOUT_MS = 10_000;

export class GithubOAuthError extends Error {}

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

// Adaptateur réel : OAuth GitHub en lecture seule (scopes read:user et user:email), avec PKCE.
export class GithubOAuthHttpProvider implements GithubOAuthProvider {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  authorizeUrl({ state, codeChallenge, redirectUri }: AuthorizeParams): string {
    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: GITHUB_SCOPES.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      allow_signup: 'true',
    }).toString();
    return url.toString();
  }

  async exchange(code: string, codeVerifier: string, redirectUri: string): Promise<GithubIdentity> {
    const tokenResponse = await this.request<{
      access_token?: string;
      scope?: string;
      error?: string;
    }>(TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    if (!tokenResponse.access_token) {
      throw new GithubOAuthError(
        `Échange du code refusé par GitHub : ${tokenResponse.error ?? 'inconnu'}`,
      );
    }
    const token = tokenResponse.access_token;
    const api = { headers: this.apiHeaders(token) };
    const [user, emails] = await Promise.all([
      this.request<GithubUser>(`${API}/user`, api),
      this.request<GithubEmail[]>(`${API}/user/emails`, api),
    ]);

    return {
      githubId: BigInt(user.id),
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      createdAt: new Date(user.created_at),
      email: pickEmail(emails),
      accessToken: token,
      scopes: (tokenResponse.scope ?? '').split(',').filter(Boolean),
    };
  }

  private apiHeaders(token: string): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'devhub-africa',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok)
      throw new GithubOAuthError(
        `GitHub a répondu ${response.status} sur ${new URL(url).pathname}`,
      );
    return (await response.json()) as T;
  }
}

/** E-mail principal vérifié, sinon un autre e-mail vérifié, sinon aucun. */
export function pickEmail(emails: GithubEmail[]): string | null {
  const verified = emails.filter((e) => e.verified);
  return (verified.find((e) => e.primary) ?? verified[0])?.email ?? null;
}
