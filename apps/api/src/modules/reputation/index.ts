// API publique du module reputation : sos et rooms appellent AwardXp dans leur propre transaction.
export { ReputationModule } from './reputation.module';
export { AwardXp, type AwardResult, type Withheld } from './application/award-xp';
export { SelfVoteError, XpEventNotRevertableError, type WithheldReason } from './domain/errors';
