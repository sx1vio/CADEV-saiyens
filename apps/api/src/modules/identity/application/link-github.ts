import type { GithubIdentity } from '../domain/github-identity';
import type { Clock, IdentityRepository, SignUpListener, TokenCipher } from '../domain/ports';

export type LinkGithubError =
  /** Ce GitHub est déjà relié à un autre compte DevHub. */
  | 'github_taken'
  /** Ce compte est déjà relié à un autre GitHub. */
  | 'already_linked';

export class LinkGithubRefused extends Error {
  constructor(readonly reason: LinkGithubError) {
    super(reason);
  }
}

/**
 * Relie un compte GitHub à un compte ouvert par e-mail (12/11/2026). Le pseudo DevHub ne change
 * pas ; le Passport affiche ensuite le vrai login GitHub, l'activité et les compétences importées.
 * Reconnecter le même GitHub rafraîchit simplement le jeton.
 */
export class LinkGithub {
  constructor(
    private readonly accounts: IdentityRepository,
    private readonly cipher: TokenCipher,
    private readonly clock: Clock,
    private readonly imports: SignUpListener,
  ) {}

  async execute(userId: string, identity: GithubIdentity): Promise<void> {
    const owner = await this.accounts.findByGithubId(identity.githubId);
    if (owner && owner.userId !== userId) throw new LinkGithubRefused('github_taken');
    const current = await this.accounts.linkedGithubId(userId);
    if (current !== null && current !== identity.githubId)
      throw new LinkGithubRefused('already_linked');

    const email =
      identity.email && (await this.accounts.isEmailAvailable(identity.email, userId))
        ? identity.email
        : null;
    await this.accounts.link({
      userId,
      githubId: identity.githubId,
      githubLogin: identity.login,
      githubCreatedAt: identity.createdAt,
      avatarUrl: identity.avatarUrl,
      email,
      accessTokenEnc: this.cipher.encrypt(identity.accessToken),
      scopes: identity.scopes,
      now: this.clock.now(),
    });
    // Import des dépôts et des compétences, comme à une inscription par GitHub.
    if (current === null) await this.imports.userSignedUp(userId);
  }
}
