import { randomBytes } from 'node:crypto';
import { Module } from '@nestjs/common';
import { GithubModule } from '../github';
import { IdentityModule } from '../identity';
import { NotificationsModule, Notifier } from '../notifications';
import { AwardXp, ReputationModule } from '../reputation';
import { Rooms } from './application/rooms';
import { RoomsActions } from './http/rooms.actions';
import { RoomsController } from './http/rooms.controller';
import { GithubRepoVerifier } from './infrastructure/github-repo.verifier';
import { RoomReader } from './infrastructure/room.reader';

// Module rooms (propriétaire : Joachim, rôle 5) : salles de projet liées à GitHub (R1 à R9).
@Module({
  imports: [IdentityModule, GithubModule, ReputationModule, NotificationsModule],
  controllers: [RoomsController],
  providers: [
    RoomReader,
    GithubRepoVerifier,
    RoomsActions,
    {
      provide: Rooms,
      inject: [AwardXp, Notifier],
      useFactory: (xp: AwardXp, notifier: Notifier) =>
        new Rooms(xp, notifier, (n) => new Uint8Array(randomBytes(n))),
    },
  ],
})
export class RoomsModule {}
