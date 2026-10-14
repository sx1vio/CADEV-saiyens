import { Module } from '@nestjs/common';
import { CheckServices } from './application/check-services';
import { PlatformController } from './http/platform.controller';
import { ImpactReader } from './infrastructure/impact.reader';
import { PrismaStatusStore } from './infrastructure/prisma-status.store';
import { BackupProbe, DatabaseProbe, MailProbe, VpsProbe } from './infrastructure/probes';
import { StatusCheckJob } from './jobs/status-check.job';
import { STATUS_STORE } from './tokens';

// Module platform (propriétaire : Emmanuel) : écran Systalink (sondes réelles) et impact (Y1, Y2).
@Module({
  controllers: [PlatformController],
  providers: [
    VpsProbe,
    DatabaseProbe,
    BackupProbe,
    MailProbe,
    ImpactReader,
    StatusCheckJob,
    { provide: STATUS_STORE, useClass: PrismaStatusStore },
    {
      provide: CheckServices,
      inject: [VpsProbe, DatabaseProbe, BackupProbe, MailProbe, STATUS_STORE],
      useFactory: (
        vps: VpsProbe,
        db: DatabaseProbe,
        backup: BackupProbe,
        mail: MailProbe,
        store: PrismaStatusStore,
      ) => new CheckServices([vps, db, backup, mail], store),
    },
  ],
  exports: [CheckServices],
})
export class PlatformModule {}
