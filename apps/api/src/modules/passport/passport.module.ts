import { Module } from '@nestjs/common';
import { GITHUB_API, type GithubApi, GithubModule } from '../github';
import { GithubTokenReader, IdentityModule } from '../identity';
import { ImportGithubProfile } from './application/import-github-profile';
import { MySkillsController } from './http/my-skills.controller';
import { PassportController } from './http/passport.controller';
import { PassportReader } from './infrastructure/passport.reader';
import { PrismaSkillStore } from './infrastructure/prisma-skill.store';
import { ImportProfileJob } from './jobs/import-profile.job';

// Module passport (propriétaire : Caleb) : profil, compétences, Passport public.
@Module({
  imports: [IdentityModule, GithubModule],
  controllers: [MySkillsController, PassportController],
  providers: [
    PrismaSkillStore,
    PassportReader,
    ImportProfileJob,
    {
      provide: ImportGithubProfile,
      inject: [GithubTokenReader, GITHUB_API, PrismaSkillStore],
      useFactory: (tokens: GithubTokenReader, github: GithubApi, store: PrismaSkillStore) =>
        new ImportGithubProfile(tokens, github, store),
    },
  ],
})
export class PassportModule {}
