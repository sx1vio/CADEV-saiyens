// API publique du module identity : ce que les autres modules ont le droit d'importer.
export { IdentityModule } from './identity.module';
export {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from './http/session.guard';
export { AllowCrossOrigin, OriginGuard, isAdminPath, isBusinessPath } from './http/origin.guard';
export { type TrustSignals, trustSignals } from './domain/trust';
export { type ResolvedPrivacy, resolvePrivacy } from './domain/privacy';
export { GithubTokenReader } from './infrastructure/github-token.reader';
export { PrismaSessionStore } from './infrastructure/prisma-session.store';
// Briques réutilisées par l'espace d'administration (module backoffice).
export { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
export { AesGcmTokenCipher } from './infrastructure/aes-gcm-token-cipher';
export { AttemptLimiter } from './http/attempt-limiter';
export { baseCookie, readCookie } from './http/cookies';
export { hashSessionToken, newSessionToken } from './application/session-token';
export { AccountDeletion } from './infrastructure/account-deletion';
