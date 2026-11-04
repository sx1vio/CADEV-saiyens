import { Module } from '@nestjs/common';
import { GITHUB_API, type GithubApi, GithubModule } from '../github';
import { GithubTokenReader, IdentityModule } from '../identity';
import { NotificationsModule } from '../notifications';
import { ImportGithubProfile } from './application/import-github-profile';
import { ContactController } from './http/contact.controller';
import { GithubActivityController } from './http/github-activity.controller';
import { GITHUB_FETCH, GithubActivityReader } from './infrastructure/github-activity.reader';
import { MySkillsController } from './http/my-skills.controller';
import { PassportController } from './http/passport.controller';
import { ProofCardController } from './http/proof-card.controller';
import { PassportReader } from './infrastructure/passport.reader';
import { PrismaSkillStore } from './infrastructure/prisma-skill.store';
import { ImportProfileJob } from './jobs/import-profile.job';

// Module passport (propriétaire : Caleb) : profil, compétences, Passport public.
@Module({
  imports: [IdentityModule, GithubModule, NotificationsModule],
  controllers: [
    MySkillsController,
    PassportController,
    ContactController,
    ProofCardController,
    GithubActivityController,
  ],
  providers: [
    PrismaSkillStore,
    PassportReader,
    ImportProfileJob,
    GithubActivityReader,
    { provide: GITHUB_FETCH, useValue: (input: string, init?: RequestInit) => fetch(input, init) },
    {
      provide: ImportGithubProfile,
      inject: [GithubTokenReader, GITHUB_API, PrismaSkillStore],
      useFactory: (tokens: GithubTokenReader, github: GithubApi, store: PrismaSkillStore) =>
        new ImportGithubProfile(tokens, github, store),
    },
  ],
  exports: [PassportReader],
})
export class PassportModule {}
