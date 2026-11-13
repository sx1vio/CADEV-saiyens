import { describe, expect, it } from 'vitest';
import type { GithubIdentity } from '../domain/github-identity';
import type { ExistingAccount, GithubLink, IdentityRepository } from '../domain/ports';
import { LinkGithub, LinkGithubRefused } from './link-github';

type Row = { userId: string; handle: string; email: string | null; githubId: bigint | null };

class Accounts implements IdentityRepository {
  links: GithubLink[] = [];
  constructor(public rows: Row[]) {}
  async findByGithubId(githubId: bigint): Promise<ExistingAccount | null> {
    const r = this.rows.find((x) => x.githubId === githubId);
    return r ? { userId: r.userId, handle: r.handle } : null;
  }
  async isHandleTaken() {
    return false;
  }
  async isEmailAvailable(email: string, except?: string) {
    return !this.rows.some((r) => r.email === email && r.userId !== except);
  }
  async create(): Promise<ExistingAccount> {
    throw new Error('not used');
  }
  async refresh() {}
  async linkedGithubId(userId: string) {
    return this.rows.find((r) => r.userId === userId)?.githubId ?? null;
  }
  async link(a: GithubLink) {
    this.links.push(a);
    const r = this.rows.find((x) => x.userId === a.userId)!;
    r.githubId = a.githubId;
  }
}

const identity = (o: Partial<GithubIdentity> = {}): GithubIdentity => ({
  githubId: 7n,
  login: 'Vrai-Login',
  name: 'Awa',
  avatarUrl: 'https://avatars.githubusercontent.com/u/7',
  createdAt: new Date('2019-01-01T00:00:00Z'),
  email: 'awa@github.test',
  accessToken: 'gho_x',
  scopes: ['read:user'],
  ...o,
});

function setup(rows: Row[]) {
  const accounts = new Accounts(rows);
  const imported: string[] = [];
  const useCase = new LinkGithub(
    accounts,
    { encrypt: (p) => Buffer.from(`enc(${p})`), decrypt: (b) => Buffer.from(b).toString() },
    { now: () => new Date('2026-11-12T10:00:00Z') },
    { userSignedUp: async (id) => void imported.push(id) },
  );
  return { accounts, imported, useCase };
}

describe('LinkGithub', () => {
  it('relie le GitHub au compte e-mail, garde le pseudo et lance l’import', async () => {
    const { accounts, imported, useCase } = setup([
      { userId: 'u1', handle: 'awa', email: 'awa@mail.test', githubId: null },
    ]);
    await useCase.execute('u1', identity());
    expect(accounts.links[0]).toMatchObject({
      userId: 'u1',
      githubId: 7n,
      githubLogin: 'Vrai-Login',
    });
    expect(Buffer.from(accounts.links[0]!.accessTokenEnc).toString()).toBe('enc(gho_x)');
    expect(imported).toEqual(['u1']);
  });

  it('refuse un GitHub déjà relié à un autre compte', async () => {
    const { useCase } = setup([
      { userId: 'u1', handle: 'awa', email: null, githubId: null },
      { userId: 'u2', handle: 'moussa', email: null, githubId: 7n },
    ]);
    await expect(useCase.execute('u1', identity())).rejects.toEqual(
      new LinkGithubRefused('github_taken'),
    );
  });

  it('refuse de remplacer un GitHub déjà relié par un autre', async () => {
    const { useCase } = setup([{ userId: 'u1', handle: 'awa', email: null, githubId: 9n }]);
    await expect(useCase.execute('u1', identity())).rejects.toEqual(
      new LinkGithubRefused('already_linked'),
    );
  });

  it('reconnecter le même GitHub rafraîchit sans relancer l’import', async () => {
    const { accounts, imported, useCase } = setup([
      { userId: 'u1', handle: 'awa', email: null, githubId: 7n },
    ]);
    await useCase.execute('u1', identity());
    expect(accounts.links).toHaveLength(1);
    expect(imported).toEqual([]);
  });

  it('ne pose pas un e-mail déjà pris par un autre compte', async () => {
    const { accounts, useCase } = setup([
      { userId: 'u1', handle: 'awa', email: null, githubId: null },
      { userId: 'u2', handle: 'moussa', email: 'awa@github.test', githubId: null },
    ]);
    await useCase.execute('u1', identity());
    expect(accounts.links[0]!.email).toBeNull();
  });
});
