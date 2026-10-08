import type { GithubIdentity } from './github-identity';

export interface AuthorizeParams {
  state: string;
  codeChallenge: string;
  redirectUri: string;
  /** Faux fournisseur uniquement : login à simuler. */
  loginHint?: string;
}

/** Fournisseur OAuth GitHub (réel ou faux pour les tests et le développement). */
export interface GithubOAuthProvider {
  authorizeUrl(params: AuthorizeParams): string;
  exchange(code: string, codeVerifier: string, redirectUri: string): Promise<GithubIdentity>;
}

export interface ExistingAccount {
  userId: string;
  handle: string;
}

export interface NewAccount {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  githubId: bigint;
  githubCreatedAt: Date;
  accessTokenEnc: Uint8Array;
  scopes: string[];
  now: Date;
}

export interface AccountRefresh {
  userId: string;
  avatarUrl: string | null;
  email: string | null;
  githubCreatedAt: Date;
  accessTokenEnc: Uint8Array;
  scopes: string[];
  now: Date;
}

export interface IdentityRepository {
  findByGithubId(githubId: bigint): Promise<ExistingAccount | null>;
  isHandleTaken(handle: string): Promise<boolean>;
  /** false si l'adresse est déjà utilisée par un autre compte (unicité de l'e-mail, A2). */
  isEmailAvailable(email: string, exceptUserId?: string): Promise<boolean>;
  create(account: NewAccount): Promise<ExistingAccount>;
  refresh(account: AccountRefresh): Promise<void>;
}

export interface NewSession {
  idHash: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  ipHash: string | null;
}

export interface SessionStore {
  create(session: NewSession): Promise<void>;
}

export interface TokenCipher {
  encrypt(plain: string): Uint8Array;
  decrypt(sealed: Uint8Array): string;
}

export interface Clock {
  now(): Date;
}

/** Réagit à une inscription (import du profil GitHub, issues #17 et #52). */
export interface SignUpListener {
  userSignedUp(userId: string): Promise<void>;
}
