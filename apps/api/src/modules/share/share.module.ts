import { Module } from '@nestjs/common';
import { PassportModule } from '../passport';
import { RoomsModule } from '../rooms';
import { ShareController } from './http/share.controller';

// Module share (propriétaire : Joachim) : aperçus de partage des Passport et des salles (R7, ADR-0012).
@Module({ imports: [PassportModule, RoomsModule], controllers: [ShareController] })
export class ShareModule {}
