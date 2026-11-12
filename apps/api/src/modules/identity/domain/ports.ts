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
  githubLogin: string;
  githubCreatedAt: Date;
  accessTokenEnc: Uint8Array;
  scopes: string[];
  now: Date;
}

export interface AccountRefresh {
  userId: string;
  githubLogin: string;
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
  /** Compte déjà relié à un GitHub (null sinon) : on ne remplace jamais un GitHub par un autre. */
  linkedGithubId(userId: string): Promise<bigint | null>;
  /** Relie un GitHub à un compte existant (ouvert par e-mail). */
  link(account: GithubLink): Promise<void>;
}

export interface GithubLink {
  userId: string;
  githubId: bigint;
  githubLogin: string;
  githubCreatedAt: Date;
  /** Photo GitHub, posée seulement si le compte n'en a pas. */
  avatarUrl: string | null;
  /** E-mail GitHub vérifié, posé seulement si le compte n'a pas d'adresse. */
  email: string | null;
  accessTokenEnc: Uint8Array;
  scopes: string[];
  now: Date;
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

/** Compte ouvert par e-mail et mot de passe (sans GitHub). */
export interface EmailAccount {
  userId: string;
  handle: string;
  /** null : compte GitHub sans mot de passe, la connexion passe par GitHub. */
  passwordHash: string | null;
}

export interface NewEmailAccount {
  handle: string;
  displayName: string;
  email: string;
  passwordHash: string;
  now: Date;
}

export interface EmailAccountRepository {
  findByEmail(email: string): Promise<EmailAccount | null>;
  isHandleTaken(handle: string): Promise<boolean>;
  /** null si l'adresse ou le pseudo vient d'être pris par une inscription simultanée. */
  createWithPassword(account: NewEmailAccount): Promise<ExistingAccount | null>;
  touch(userId: string, now: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
}
