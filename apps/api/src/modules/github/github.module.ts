import { Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { GITHUB_API } from './domain/ports';
import { FakeGithubClient } from './infrastructure/fake-github.client';
import { GithubHttpClient } from './infrastructure/github-http.client';

// Module github (propriétaire : Joachim) : adaptateur de l'API GitHub en lecture seule.
@Module({
  providers: [
    {
      provide: GITHUB_API,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.AUTH_FAKE_PROVIDER ? new FakeGithubClient() : new GithubHttpClient(),
    },
  ],
  exports: [GITHUB_API],
})
export class GithubModule {}
