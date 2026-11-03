import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { PostsController } from './http/posts.controller';
import { PostsRepository } from './infrastructure/posts.repository';

// Fil de la communauté : publications, commentaires en fil, votes, activité des communautés.
@Module({
  imports: [IdentityModule],
  controllers: [PostsController],
  providers: [PostsRepository],
})
export class CommunityModule {}
