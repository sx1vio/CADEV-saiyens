import { describe, expect, it } from 'vitest';
import type {
  EmailAccount,
  EmailAccountRepository,
  NewEmailAccount,
  NewSession,
  PasswordHasher,
  SessionStore,
} from '../domain/ports';
import { hashSessionToken } from './session-token';
import { BadCredentialsError, EmailTakenError, SignInWithEmail } from './sign-in-with-email';

class InMemoryAccounts implements EmailAccountRepository {
  rows: Array<EmailAccount & { email: string; displayName: string }> = [];
  touched: string[] = [];
  async findByEmail(email: string) {
    return this.rows.find((r) => r.email === email) ?? null;
  }
  async isHandleTaken(handle: string) {
    return this.rows.some((r) => r.handle === handle);
  }
  async createWithPassword(a: NewEmailAccount) {
    const row = { userId: `u${this.rows.length + 1}`, ...a };
    this.rows.push(row);
    return { userId: row.userId, handle: row.handle };
  }
  async touch(userId: string) {
    this.touched.push(userId);
  }
}

class InMemorySessions implements SessionStore {
  sessions: NewSession[] = [];
  async create(s: NewSession) {
    this.sessions.push(s);
  }
}

// Hachage factice : le vrai (scrypt) est testé à part
const hasher: PasswordHasher & { verified: string[] } = {
  verified: [],
  hash: async (pw) => `h(${pw})`,
  verify: async (pw, stored) => {
    hasher.verified.push(stored);
    return stored === `h(${pw})`;
  },
};
const now = new Date('2026-10-26T09:00:00Z');
const context = { userAgent: 'test', ipHash: 'ip' };

function setup() {
  const accounts = new InMemoryAccounts();
  const sessions = new InMemorySessions();
  const auth = new SignInWithEmail(accounts, sessions, hasher, { now: () => now }, () => 'x1y2');
  return { accounts, sessions, auth };
}

describe('SignInWithEmail', () => {
  it('crée le compte, stocke le hash et ouvre une session', async () => {
    const { accounts, sessions, auth } = setup();
    const r = await auth.signUp(
      { displayName: 'Awa Koné', email: 'awa@example.test', password: 'une phrase sûre' },
      context,
    );
    expect(r.isNewUser).toBe(true);
    expect(accounts.rows[0]).toMatchObject({
      email: 'awa@example.test',
      passwordHash: 'h(une phrase sûre)',
    });
    expect(sessions.sessions[0]!.idHash).toBe(hashSessionToken(r.sessionToken));
    expect(r.sessionExpiresAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("tire le pseudo du nom affiché (accents retirés), jamais de l'adresse", async () => {
    const { auth } = setup();
    const r = await auth.signUp(
      { displayName: 'Awa Koné', email: 'secret.perso@example.test', password: 'une phrase sûre' },
      context,
    );
    expect(r.handle).toBe('awa-kone');
  });

  it('ajoute un suffixe si le pseudo est pris', async () => {
    const { auth } = setup();
    await auth.signUp(
      { displayName: 'Awa', email: 'a@example.test', password: 'xxxxxxxx' },
      context,
    );
    const r = await auth.signUp(
      { displayName: 'Awa', email: 'b@example.test', password: 'xxxxxxxx' },
      context,
    );
    expect(r.handle).toBe('awa-2');
  });

  it('refuse une adresse déjà inscrite', async () => {
    const { auth } = setup();
    await auth.signUp(
      { displayName: 'Awa', email: 'a@example.test', password: 'xxxxxxxx' },
      context,
    );
    await expect(
      auth.signUp({ displayName: 'Autre', email: 'a@example.test', password: 'yyyyyyyy' }, context),
    ).rejects.toBeInstanceOf(EmailTakenError);
  });

  it('connecte avec le bon mot de passe et met à jour la dernière visite', async () => {
    const { accounts, sessions, auth } = setup();
    await auth.signUp(
      { displayName: 'Awa', email: 'a@example.test', password: 'xxxxxxxx' },
      context,
    );
    const r = await auth.signIn('a@example.test', 'xxxxxxxx', context);
    expect(r).toMatchObject({ userId: 'u1', isNewUser: false });
    expect(accounts.touched).toEqual(['u1']);
    expect(sessions.sessions).toHaveLength(2);
  });

  it('même erreur pour un mauvais mot de passe, une adresse inconnue ou un compte GitHub seul', async () => {
    const { accounts, sessions, auth } = setup();
    await auth.signUp(
      { displayName: 'Awa', email: 'a@example.test', password: 'xxxxxxxx' },
      context,
    );
    accounts.rows.push({
      userId: 'gh',
      handle: 'gh',
      email: 'gh@example.test',
      displayName: 'GH',
      passwordHash: null,
    });
    for (const [email, pw] of [
      ['a@example.test', 'mauvais'],
      ['inconnu@example.test', 'xxxxxxxx'],
      ['gh@example.test', 'xxxxxxxx'],
    ] as const)
      await expect(auth.signIn(email, pw, context)).rejects.toBeInstanceOf(BadCredentialsError);
    expect(sessions.sessions).toHaveLength(1);
  });

  it("vérifie quand même un hash quand l'adresse est inconnue (temps constant)", async () => {
    const { auth } = setup();
    hasher.verified.length = 0;
    await expect(auth.signIn('inconnu@example.test', 'pw', context)).rejects.toThrow();
    expect(hasher.verified).toHaveLength(1);
  });
});
