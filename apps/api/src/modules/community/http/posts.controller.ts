import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  CreatePostCommentRequest,
  CreatePostRequest,
  ListCommunitiesResponse,
  ListPostsQuery,
  ListPostsResponse,
  PostDetail,
  PostVoteRequest,
  type PostVoteResponse,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  type AuthenticatedUser,
  CurrentUser,
  OptionalSessionGuard,
  OptionalUser,
  SessionGuard,
} from '../../identity';
import { COMMENTS_PER_DAY, NEW_ACCOUNT_LINK_DELAY_MS, POSTS_PER_DAY } from '../domain/limits';
import { PostsRepository } from '../infrastructure/posts.repository';

class CreatePostRequestDto extends createZodDto(CreatePostRequest) {}
class CreatePostCommentRequestDto extends createZodDto(CreatePostCommentRequest) {}
class PostVoteRequestDto extends createZodDto(PostVoteRequest) {}
class ListPostsQueryDto extends createZodDto(ListPostsQuery) {}
class ListPostsResponseDto extends createZodDto(ListPostsResponse) {}
class PostDetailDto extends createZodDto(PostDetail) {}
class ListCommunitiesResponseDto extends createZodDto(ListCommunitiesResponse) {}

const DAY = 24 * 60 * 60 * 1000;
const notFound = () => new NotFoundException({ code: 'not_found', title: 'Post not found' });
const tooMany = (code: string) =>
  new HttpException({ code, title: 'Daily limit reached' }, HttpStatus.TOO_MANY_REQUESTS);

// Fil de la communauté : lecture publique ; publier, commenter et voter demandent un compte.
@Controller('api/v1')
export class PostsController {
  constructor(
    private readonly posts: PostsRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get('communities')
  @ApiOkResponse({ type: ListCommunitiesResponseDto })
  communities(): Promise<ListCommunitiesResponse> {
    return this.posts.communities(new Date());
  }

  @Get('posts')
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: ListPostsResponseDto })
  list(
    @Query() q: ListPostsQueryDto,
    @OptionalUser() auth: AuthenticatedUser | null,
  ): Promise<ListPostsResponse> {
    return this.posts.list(q, auth?.userId ?? null);
  }

  @Get('posts/:id')
  @UseGuards(OptionalSessionGuard)
  @ApiOkResponse({ type: PostDetailDto })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @OptionalUser() auth: AuthenticatedUser | null,
  ): Promise<PostDetail> {
    const post = await this.posts.detail(id, auth?.userId ?? null);
    if (!post) throw notFound();
    return post;
  }

  @Post('posts')
  @UseGuards(SessionGuard)
  async create(
    @Body() body: CreatePostRequestDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<{ id: string }> {
    const now = Date.now();
    if ((await this.posts.countSince('post', auth.userId, new Date(now - DAY))) >= POSTS_PER_DAY)
      throw tooMany('post.daily_limit');
    if (body.linkUrl || /https?:\/\//i.test(body.body)) {
      const user = await this.prisma.user.findUnique({
        where: { id: auth.userId },
        select: { createdAt: true },
      });
      if (user && now - user.createdAt.getTime() < NEW_ACCOUNT_LINK_DELAY_MS)
        throw new UnprocessableEntityException({
          code: 'post.links_too_early',
          title: 'New accounts cannot post links during their first hour',
        });
    }
    return { id: await this.posts.create(body, auth.userId) };
  }

  @Delete('posts/:id')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: AuthenticatedUser) {
    if (!(await this.posts.deleteOwn(id, auth.userId))) throw notFound();
  }

  @Post('posts/:id/comments')
  @UseGuards(SessionGuard)
  async comment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreatePostCommentRequestDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<{ id: string }> {
    if (!(await this.posts.exists(id))) throw notFound();
    if (body.parentId && !(await this.posts.commentBelongs(body.parentId, id)))
      throw new UnprocessableEntityException({
        code: 'comment.parent_not_found',
        title: 'The parent comment is not on this post',
      });
    if (
      (await this.posts.countSince('comment', auth.userId, new Date(Date.now() - DAY))) >=
      COMMENTS_PER_DAY
    )
      throw tooMany('comment.daily_limit');
    return { id: await this.posts.addComment(id, auth.userId, body.body, body.parentId) };
  }

  @Delete('posts/:id/comments/:commentId')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async removeComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    if (!(await this.posts.deleteOwnComment(commentId, auth.userId))) throw notFound();
  }

  @Put('posts/:id/vote')
  @UseGuards(SessionGuard)
  async vote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PostVoteRequestDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<PostVoteResponse> {
    if (!(await this.posts.exists(id))) throw notFound();
    return this.posts.vote(id, auth.userId, body.value);
  }
}
