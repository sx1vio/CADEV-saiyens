import { randomBytes } from 'node:crypto';
import { Module } from '@nestjs/common';
import { GithubModule } from '../github';
import { IdentityModule } from '../identity';
import { NotificationsModule, Notifier } from '../notifications';
import { AwardXp, ReputationModule } from '../reputation';
import { Rooms } from './application/rooms';
import { RoomMessages, Tasks } from './application/tasks';
import { RoomsActions } from './http/rooms.actions';
import { RoomsController } from './http/rooms.controller';
import { TasksActions } from './http/tasks.actions';
import { TasksController } from './http/tasks.controller';
import { GithubPrVerifier } from './infrastructure/github-pr.verifier';
import { GithubRepoVerifier } from './infrastructure/github-repo.verifier';
import { RoomReader } from './infrastructure/room.reader';
import { VerifyPrJob } from './jobs/verify-pr.job';

// Module rooms (propriétaire : Joachim, rôle 5) : salles de projet liées à GitHub (R1 à R9).
@Module({
  imports: [IdentityModule, GithubModule, ReputationModule, NotificationsModule],
  controllers: [RoomsController, TasksController],
  providers: [
    RoomReader,
    GithubRepoVerifier,
    RoomsActions,
    TasksActions,
    GithubPrVerifier,
    VerifyPrJob,
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
