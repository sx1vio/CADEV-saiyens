import { beforeEach, describe, expect, it } from 'vitest';
import type { GithubIdentity } from '../domain/github-identity';
import type {
  AccountRefresh,
  ExistingAccount,
  IdentityRepository,
  NewAccount,
  NewSession,
  SessionStore,
  TokenCipher,
} from '../domain/ports';
import { hashSessionToken } from './session-token';
import { SignInWithGithub } from './sign-in-with-github';

class InMemoryAccounts implements IdentityRepository {
  rows: Array<{
    userId: string;
    handle: string;
    email: string | null;
    githubId: bigint;
    refreshes: number;
    data: NewAccount | AccountRefresh;
  }> = [];
  async findByGithubId(githubId: bigint): Promise<ExistingAccount | null> {
    const row = this.rows.find((r) => r.githubId === githubId);
    return row ? { userId: row.userId, handle: row.handle } : null;
  }
  async isHandleTaken(handle: string) {
    return this.rows.some((r) => r.handle === handle);
  }
  async isEmailAvailable(email: string, exceptUserId?: string) {
    return !this.rows.some((r) => r.email === email && r.userId !== exceptUserId);
  }
  async create(a: NewAccount) {
    const row = {
      userId: `u${this.rows.length + 1}`,
      handle: a.handle,
      email: a.email,
      githubId: a.githubId,
      refreshes: 0,
      data: a,
    };
    this.rows.push(row);
    return { userId: row.userId, handle: row.handle };
  }
  async refresh(a: AccountRefresh) {
    const row = this.rows.find((r) => r.userId === a.userId)!;
    row.refreshes++;
    row.email = a.email;
    row.data = a;
  }
}

class InMemorySessions implements SessionStore {
  sessions: NewSession[] = [];
  async create(s: NewSession) {
    this.sessions.push(s);
  }
}

const cipher: TokenCipher = {
  encrypt: (plain) => Buffer.from(`enc(${plain})`),
  decrypt: (sealed) => Buffer.from(sealed).toString(),
};
const now = new Date('2026-10-07T10:00:00Z');

function identity(overrides: Partial<GithubIdentity> = {}): GithubIdentity {
  return {
    githubId: 101n,
    login: 'Awa-Dev',
    name: 'Awa Traoré',
    avatarUrl: 'https://avatars.githubusercontent.com/u/101',
    createdAt: new Date('2019-03-01T00:00:00Z'),
    email: 'awa@example.test',
    accessToken: 'gho_secret',
    scopes: ['read:user', 'user:email'],
    ...overrides,
  };
}

describe('SignInWithGithub', () => {
  let accounts: InMemoryAccounts;
  let sessions: InMemorySessions;
  let signedUp: string[];
  let useCase: SignInWithGithub;

  beforeEach(() => {
    accounts = new InMemoryAccounts();
    sessions = new InMemorySessions();
    signedUp = [];
    useCase = new SignInWithGithub(
      accounts,
      sessions,
      cipher,
      { now: () => now },
      { userSignedUp: async (id) => void signedUp.push(id) },
      () => 'zz99',
    );
  });

  const ctx = { userAgent: 'test', ipHash: 'abc' };

  it('crée le compte à la première connexion, avec pseudo, e-mail et jeton chiffré', async () => {
    const result = await useCase.execute(identity(), ctx);

    expect(result).toMatchObject({ userId: 'u1', handle: 'awa-dev', isNewUser: true });
    const created = accounts.rows[0]!.data as NewAccount;
    expect(created).toMatchObject({
      displayName: 'Awa Traoré',
      email: 'awa@example.test',
      githubId: 101n,
    });
    expect(Buffer.from(created.accessTokenEnc).toString()).toBe('enc(gho_secret)');
    expect(signedUp).toEqual(['u1']);
  });

  it('ouvre une session de 30 jours dont seule l’empreinte est stockée', async () => {
    const result = await useCase.execute(identity(), ctx);

    expect(sessions.sessions).toHaveLength(1);
    expect(sessions.sessions[0]!.idHash).toBe(hashSessionToken(result.sessionToken));
    expect(sessions.sessions[0]!.idHash).not.toContain(result.sessionToken);
    expect(result.sessionExpiresAt.toISOString()).toBe('2026-11-06T10:00:00.000Z');
  });

  it('reconnaît le compte à la connexion suivante sans changer le pseudo', async () => {
    await useCase.execute(identity(), ctx);
    const second = await useCase.execute(
      identity({ login: 'awa-renamed', avatarUrl: 'https://new' }),
      ctx,
    );

    expect(second).toMatchObject({ userId: 'u1', handle: 'awa-dev', isNewUser: false });
    expect(accounts.rows).toHaveLength(1);
    expect(accounts.rows[0]!.refreshes).toBe(1);
    expect((accounts.rows[0]!.data as AccountRefresh).avatarUrl).toBe('https://new');
    expect(signedUp).toEqual(['u1']);
    expect(sessions.sessions).toHaveLength(2);
  });

  it('choisit un pseudo libre si le login est déjà pris', async () => {
    await useCase.execute(identity(), ctx);
    const other = await useCase.execute(
      identity({ githubId: 202n, email: 'autre@example.test' }),
      ctx,
    );
    expect(other.handle).toBe('awa-dev-2');
  });

  it('utilise le login quand GitHub ne fournit pas de nom', async () => {
    await useCase.execute(identity({ name: '  ' }), ctx);
    expect((accounts.rows[0]!.data as NewAccount).displayName).toBe('Awa-Dev');
  });

  it('n’enregistre pas un e-mail déjà utilisé par un autre compte', async () => {
    await useCase.execute(identity(), ctx);
    await useCase.execute(identity({ githubId: 202n, login: 'moussa' }), ctx);
    expect(accounts.rows[1]!.email).toBeNull();
  });

  it('accepte un compte GitHub sans e-mail vérifié', async () => {
    await useCase.execute(identity({ email: null }), ctx);
    expect(accounts.rows[0]!.email).toBeNull();
  });
});
