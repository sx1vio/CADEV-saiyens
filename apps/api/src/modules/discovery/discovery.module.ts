import { Module } from '@nestjs/common';
import { DiscoveryController } from './http/discovery.controller';
import { DiscoveryReader } from './infrastructure/discovery.reader';

// Module discovery (propriétaire : Caleb) : D1, D2. Lecture seule, multi-tables (02-backend.md).
@Module({ controllers: [DiscoveryController], providers: [DiscoveryReader] })
export class DiscoveryModule {}
