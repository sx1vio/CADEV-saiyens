import { randomBytes } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { GithubModule } from '../github';
import { IdentityModule } from '../identity';
import { NotificationsModule, Notifier } from '../notifications';
import { AwardXp, ReputationModule } from '../reputation';
import { Rooms } from './application/rooms';
import type { DeploymentProbe } from './domain/ports';
import { Deployments } from './application/deployments';
import { RoomMessages, Tasks } from './application/tasks';
import { DeploymentController } from './http/deployment.controller';
import { RoomsActions } from './http/rooms.actions';
import { RoomsController } from './http/rooms.controller';
import { TasksActions } from './http/tasks.actions';
import { TasksController } from './http/tasks.controller';
import { HttpDeploymentProbe } from './infrastructure/deployment.probe';
import { GithubPrVerifier } from './infrastructure/github-pr.verifier';
import { GithubRepoVerifier } from './infrastructure/github-repo.verifier';
import { PrismaDeploymentUnitOfWork } from './infrastructure/prisma-deployment.store';
import { RoomReader } from './infrastructure/room.reader';
import { DeploymentCheckJob } from './jobs/deployment-check.job';
import { VerifyPrJob } from './jobs/verify-pr.job';
import { DEPLOYMENT_PROBE } from './tokens';

// Module rooms (propriétaire : Joachim, rôle 5) : salles de projet liées à GitHub (R1 à R9).
@Module({
  imports: [IdentityModule, GithubModule, ReputationModule, NotificationsModule],
  controllers: [RoomsController, TasksController, DeploymentController],
  providers: [
    RoomReader,
    GithubRepoVerifier,
    RoomsActions,
    TasksActions,
    GithubPrVerifier,
    VerifyPrJob,
    DeploymentCheckJob,
    PrismaDeploymentUnitOfWork,
    { provide: DEPLOYMENT_PROBE, useClass: HttpDeploymentProbe },
    {
      provide: Deployments,
      inject: [PrismaDeploymentUnitOfWork, DEPLOYMENT_PROBE, AwardXp, ENV],
      useFactory: (
        uow: PrismaDeploymentUnitOfWork,
        probe: DeploymentProbe,
        xp: AwardXp,
        env: Env,
      ) =>
        new Deployments(
          uow,
          probe,
          xp,
          env.SYSTALINK_IP_RANGES,
          (n) => new Uint8Array(randomBytes(n)),
        ),
    },
    { provide: RoomMessages, useFactory: () => new RoomMessages() },
    {
      provide: Tasks,
      inject: [AwardXp, Notifier],
      useFactory: (xp: AwardXp, notifier: Notifier) => new Tasks(xp, notifier),
    },
    {
      provide: Rooms,
      inject: [AwardXp, Notifier],
      useFactory: (xp: AwardXp, notifier: Notifier) =>
        new Rooms(xp, notifier, (n) => new Uint8Array(randomBytes(n))),
    },
  ],
  exports: [RoomReader],
})
export class RoomsModule {}
