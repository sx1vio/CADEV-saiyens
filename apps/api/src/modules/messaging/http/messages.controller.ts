import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  type ConversationsResponse,
  type DirectMessageView,
  type DirectMessagesResponse,
  SendDirectMessageRequest,
  StartConversationRequest,
} from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { MessagingRepository } from '../infrastructure/messaging.repository';

class StartDto extends createZodDto(StartConversationRequest) {}
class SendDto extends createZodDto(SendDirectMessageRequest) {}

const notFound = () => new NotFoundException({ code: 'not_found', title: 'Not found' });
const failure = (reason: 'not_found' | 'self' | 'unavailable' | 'rate_limited') => {
  if (reason === 'self')
    return new UnprocessableEntityException({
      code: 'message.self',
      title: 'Cannot message yourself',
    });
  if (reason === 'unavailable')
    return new ForbiddenException({
      code: 'message.unavailable',
      title: 'Cannot message this member',
    });
  if (reason === 'rate_limited')
    return new HttpException(
      { code: 'rate_limited', title: 'Slow down' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  return notFound();
};

// Messagerie privée entre membres : conversations à deux, mises à jour en temps réel (dm:<id>).
@Controller('api/v1')
@UseGuards(SessionGuard)
export class MessagesController {
  constructor(private readonly repo: MessagingRepository) {}

  @Get('conversations')
  list(@CurrentUser() auth: AuthenticatedUser): Promise<ConversationsResponse> {
    return this.repo.list(auth.userId);
  }

  @Post('conversations')
  async start(
    @Body() body: StartDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<{ id: string }> {
    const r = await this.repo.start(auth.userId, body.handle.replace(/^@/, ''), new Date());
    if (!r.ok) throw failure(r.reason);
    return { id: r.id };
  }

  @Get('conversations/:id/messages')
  async messages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('before') before: string | undefined,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<DirectMessagesResponse> {
    const at = before && !Number.isNaN(Date.parse(before)) ? new Date(before) : null;
    const r = await this.repo.messages(auth.userId, id, at);
    if (!r) throw notFound();
    return r;
  }

  @Post('conversations/:id/messages')
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SendDto,
    @CurrentUser() auth: AuthenticatedUser,
  ): Promise<DirectMessageView> {
    const r = await this.repo.send(auth.userId, id, body.body, body.clientId, new Date());
    if (!r.ok) throw failure(r.reason);
    return r.message;
  }

  @Post('conversations/:id/read')
  @HttpCode(204)
  async read(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: AuthenticatedUser) {
    if (!(await this.repo.markRead(auth.userId, id, new Date()))) throw notFound();
  }

  @Post('users/:handle/block')
  @HttpCode(204)
  async block(@Param('handle') handle: string, @CurrentUser() auth: AuthenticatedUser) {
    if (!(await this.repo.block(auth.userId, handle.slice(0, 40)))) throw notFound();
  }

  @Delete('users/:handle/block')
  @HttpCode(204)
  async unblock(@Param('handle') handle: string, @CurrentUser() auth: AuthenticatedUser) {
    if (!(await this.repo.unblock(auth.userId, handle.slice(0, 40)))) throw notFound();
  }
}
