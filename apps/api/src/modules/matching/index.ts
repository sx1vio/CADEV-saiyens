// API publique du module matching. sos appelle MatchingPort.markAnswered dans sa transaction.
export { MatchingModule } from './matching.module';
export { PrismaMatchingStore as MatchingPort } from './infrastructure/prisma-matching.store';
