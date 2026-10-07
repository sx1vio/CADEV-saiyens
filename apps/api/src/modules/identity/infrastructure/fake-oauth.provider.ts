import { createHash } from 'node:crypto';
import { GITHUB_SCOPES, type GithubIdentity } from '../domain/github-identity';
import type { AuthorizeParams, GithubOAuthProvider } from '../domain/ports';

// Faux fournisseur GitHub pour le développement, la CI et les tests de bout en bout.
// Activé seulement si AUTH_FAKE_PROVIDER=true, ce que la configuration interdit en production.
// /auth/github?login=awa-dev redirige directement vers le callback avec un code « fake:awa-dev ».
const LOGIN = /^[a-zA-Z0-9-]{1,39}$/;

export class FakeGithubOAuthProvider implements GithubOAuthProvider {
  authorizeUrl({ state, redirectUri, loginHint }: AuthorizeParams): string {
    const login = loginHint && LOGIN.test(loginHint) ? loginHint : 'demo-dev';
    const url = new URL(redirectUri);
    url.searchParams.set('code', `fake:${login}`);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchange(code: string): Promise<GithubIdentity> {
    const login = code.startsWith('fake:') ? code.slice(5) : '';
    if (!LOGIN.test(login)) throw new Error('Code de faux fournisseur invalide');
    // Identifiant stable dérivé du login, hors de la plage des vrais identifiants GitHub récents.
    const githubId =
      9_000_000_000_000n +
      BigInt(`0x${createHash('sha256').update(login).digest('hex').slice(0, 10)}`);
    return {
      githubId,
      login,
      name: null,
      avatarUrl: null,
      createdAt: new Date('2020-01-01T00:00:00Z'),
      email: `${login.toLowerCase()}@example.test`,
      accessToken: `fake-token-${login}`,
      scopes: [...GITHUB_SCOPES],
    };
  }
}
