import { randomBytes } from 'node:crypto';
import type { GithubIdentity } from '../domain/github-identity';
import { handleCandidates, handleFromLogin } from '../domain/handle';
import type {
  Clock,
  IdentityRepository,
  SessionStore,
  SignUpListener,
  TokenCipher,
} from '../domain/ports';
import { SESSION_TTL_MS, hashSessionToken, newSessionToken } from './session-token';

export interface SignInResult {
  userId: string;
  handle: string;
  isNewUser: boolean;
  /** Jeton brut à poser dans le cookie ; jamais stocké. */
  sessionToken: string;
  sessionExpiresAt: Date;
}

export interface SignInContext {
  userAgent: string | null;
  ipHash: string | null;
}

// A1 : connexion GitHub. Crée le compte à la première connexion, rafraîchit les données GitHub
// ensuite (sans toucher au pseudo, qui sert d'URL publique), puis ouvre une session.
export class SignInWithGithub {
  constructor(
    private readonly accounts: IdentityRepository,
    private readonly sessions: SessionStore,
    private readonly cipher: TokenCipher,
    private readonly clock: Clock,
    private readonly signUps: SignUpListener,
    private readonly randomSuffix: () => string = () => randomBytes(3).toString('hex').slice(0, 4),
  ) {}

  async execute(identity: GithubIdentity, context: SignInContext): Promise<SignInResult> {
    const now = this.clock.now();
    const accessTokenEnc = this.cipher.encrypt(identity.accessToken);
    const existing = await this.accounts.findByGithubId(identity.githubId);

    let userId: string;
    let handle: string;
    if (existing) {
      const email =
        identity.email && (await this.accounts.isEmailAvailable(identity.email, existing.userId))
          ? identity.email
          : null;
      await this.accounts.refresh({
        userId: existing.userId,
        avatarUrl: identity.avatarUrl,
        email,
        githubCreatedAt: identity.createdAt,
        accessTokenEnc,
        scopes: identity.scopes,
        now,
      });
      ({ userId, handle } = existing);
    } else {
      const email =
        identity.email && (await this.accounts.isEmailAvailable(identity.email))
          ? identity.email
          : null;
      const created = await this.accounts.create({
        handle: await this.freeHandle(identity.login),
        displayName: identity.name?.trim() || identity.login,
        avatarUrl: identity.avatarUrl,
        email,
        githubId: identity.githubId,
        githubCreatedAt: identity.createdAt,
        accessTokenEnc,
        scopes: identity.scopes,
        now,
      });
      ({ userId, handle } = created);
    }

    const sessionToken = newSessionToken();
    const sessionExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await this.sessions.create({
      idHash: hashSessionToken(sessionToken),
      userId,
      expiresAt: sessionExpiresAt,
      userAgent: context.userAgent,
      ipHash: context.ipHash,
    });

    if (!existing) await this.signUps.userSignedUp(userId);
    return { userId, handle, isNewUser: !existing, sessionToken, sessionExpiresAt };
  }

  private async freeHandle(login: string): Promise<string> {
    for (const candidate of handleCandidates(handleFromLogin(login), this.randomSuffix)) {
      if (!(await this.accounts.isHandleTaken(candidate))) return candidate;
    }
    throw new Error('unreachable');
  }
}
