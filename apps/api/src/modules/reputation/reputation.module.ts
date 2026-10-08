import { Module } from '@nestjs/common';
import { AwardXp } from './application/award-xp';
import { ProofsController } from './http/proofs.controller';
import { RulesController } from './http/rules.controller';
import { PrismaLedgerUnitOfWork } from './infrastructure/prisma-xp-ledger';

// Module reputation (propriétaire : Caleb) : journal append-only des Proof XP, barème et garde-fous.
@Module({
  controllers: [ProofsController, RulesController],
  providers: [
    PrismaLedgerUnitOfWork,
    {
      provide: AwardXp,
      inject: [PrismaLedgerUnitOfWork],
      useFactory: (uow: PrismaLedgerUnitOfWork) => new AwardXp(uow),
    },
  ],
  exports: [AwardXp],
})
export class ReputationModule {}
