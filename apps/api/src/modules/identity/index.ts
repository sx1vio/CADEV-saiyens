// API publique du module identity : ce que les autres modules ont le droit d'importer.
export { IdentityModule } from './identity.module';
export {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from './http/session.guard';
export { OriginGuard } from './http/origin.guard';
export { GithubTokenReader } from './infrastructure/github-token.reader';
export { PrismaSessionStore } from './infrastructure/prisma-session.store';
