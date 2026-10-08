import { Global, Module } from '@nestjs/common';
import { JobQueue } from './job-queue';

@Global()
@Module({
  providers: [JobQueue],
  exports: [JobQueue],
})
export class JobsModule {}
