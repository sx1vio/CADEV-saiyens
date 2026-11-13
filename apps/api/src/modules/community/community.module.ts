import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { MediaController } from './http/media.controller';
import { PostsController } from './http/posts.controller';
import { ActivityReader } from './infrastructure/activity.reader';
import { PostsRepository } from './infrastructure/posts.repository';

// Fil de la communauté : publications, commentaires en fil, votes, activité des communautés.
@Module({
  imports: [IdentityModule],
  controllers: [PostsController, MediaController],
  providers: [PostsRepository, ActivityReader],
})
export class CommunityModule {}
