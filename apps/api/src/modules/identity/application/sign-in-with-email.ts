import { randomBytes } from 'node:crypto';
import { handleCandidates, handleFromLogin } from '../domain/handle';
import type { Clock, EmailAccountRepository, PasswordHasher, SessionStore } from '../domain/ports';
import { SESSION_TTL_MS, hashSessionToken, newSessionToken } from './session-token';
import type { SignInContext, SignInResult } from './sign-in-with-github';

/** L'adresse a déjà un compte (inscription) : le front propose de se connecter. */
export class EmailTakenError extends Error {
  constructor() {
    super('email already registered');
  }
}

/** Adresse inconnue, mot de passe faux ou compte GitHub sans mot de passe : une seule réponse. */
export class BadCredentialsError extends Error {
  constructor() {
    super('bad credentials');
  }
}

export interface EmailSignUp {
  displayName: string;
  email: string;
  password: string;
}

// Compte par e-mail et mot de passe, pour les devs qui n'ont pas (encore) de compte GitHub.
// Mêmes sessions que l'OAuth (cookie HttpOnly, ADR-0009) ; le Passport se remplira par les
// preuves, et GitHub pourra être relié plus tard.
export class SignInWithEmail {
  /** Hash d'un mot de passe jetable : une adresse inconnue coûte autant qu'un mauvais mot de passe. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly accounts: EmailAccountRepository,
    private readonly sessions: SessionStore,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly randomSuffix: () => string = () => randomBytes(3).toString('hex').slice(0, 4),
  ) {}

  async signUp(input: EmailSignUp, context: SignInContext): Promise<SignInResult> {
    if (await this.accounts.findByEmail(input.email)) throw new EmailTakenError();
    const now = this.clock.now();
    const created = await this.accounts.createWithPassword({
      // Le pseudo vient du nom affiché, jamais de l'adresse (elle ne doit pas fuiter dans l'URL)
      handle: await this.freeHandle(input.displayName.normalize('NFD').replace(/\p{M}/gu, '')),
      displayName: input.displayName,
      email: input.email,
      passwordHash: await this.hasher.hash(input.password),
      now,
    });
    if (!created) throw new EmailTakenError();
    return { ...created, isNewUser: true, ...(await this.openSession(created.userId, context)) };
  }

  async signIn(email: string, password: string, context: SignInContext): Promise<SignInResult> {
    const account = await this.accounts.findByEmail(email);
    if (!account?.passwordHash) {
      this.dummyHash ??= this.hasher.hash(randomBytes(12).toString('hex'));
      await this.hasher.verify(password, await this.dummyHash);
      throw new BadCredentialsError();
    }
    if (!(await this.hasher.verify(password, account.passwordHash)))
      throw new BadCredentialsError();
    await this.accounts.touch(account.userId, this.clock.now());
    return {
      userId: account.userId,
      handle: account.handle,
      isNewUser: false,
      ...(await this.openSession(account.userId, context)),
    };
  }

  private async openSession(userId: string, context: SignInContext) {
    const sessionToken = newSessionToken();
    const sessionExpiresAt = new Date(this.clock.now().getTime() + SESSION_TTL_MS);
    await this.sessions.create({
      idHash: hashSessionToken(sessionToken),
      userId,
      expiresAt: sessionExpiresAt,
      userAgent: context.userAgent,
      ipHash: context.ipHash,
    });
    return { sessionToken, sessionExpiresAt };
  }

  private async freeHandle(seed: string): Promise<string> {
    for (const candidate of handleCandidates(handleFromLogin(seed), this.randomSuffix)) {
      if (!(await this.accounts.isHandleTaken(candidate))) return candidate;
    }
    throw new Error('unreachable');
  }
}
