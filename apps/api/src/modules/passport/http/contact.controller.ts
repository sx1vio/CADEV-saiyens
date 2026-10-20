import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse } from '@nestjs/swagger';
import { ContactRequest, ContactResponse } from '@devhub/contracts';
import { createZodDto } from 'nestjs-zod';
import { IdempotencyKey } from '../../../infrastructure/idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { type AuthenticatedUser, CurrentUser, SessionGuard } from '../../identity';
import { Notifier } from '../../notifications';
import { contactRetryAfter } from '../domain/contact';

class ContactRequestDto extends createZodDto(ContactRequest) {}
class ContactResponseDto extends createZodDto(ContactResponse) {}

@Controller('api/v1/u')
export class ContactController {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly notifier: Notifier,
  ) {}

  /**
   * PR4 : écrire à un dev depuis son Passport. Le message devient une notification
   * `contact.request` ; le récapitulatif e-mail (Y3) la relaie si la personne l'accepte.
   * Aucune adresse n'est montrée, ni à l'un ni à l'autre.
   */
  @Post(':handle/contact')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: ContactResponseDto })
  async contact(
    @CurrentUser() auth: AuthenticatedUser,
    @IdempotencyKey() key: string,
    @Param('handle') handle: string,
    @Body() body: ContactRequestDto,
  ): Promise<ContactResponse> {
    const outcome = await this.idempotency.run(
      { userId: auth.userId, key, endpoint: `POST /u/${handle.toLowerCase()}/contact`, body },
      async (tx) => {
        const target = /^[A-Za-z0-9-]{1,40}$/.test(handle)
          ? await tx.user.findFirst({
              where: { handle, deletedAt: null },
              select: { id: true },
            })
          : null;
        if (!target) throw new NotFoundException({ code: 'not_found', title: 'Dev not found' });
        if (target.id === auth.userId) {
          throw new UnprocessableEntityException({
            code: 'unprocessable',
            title: 'You cannot contact yourself',
          });
        }

        const now = new Date();
        const sent = await tx.notification.findMany({
          where: {
            type: 'contact.request',
            payload: { path: ['senderId'], equals: auth.userId },
            createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
          select: { createdAt: true },
        });
        const retryAfter = contactRetryAfter(
          sent.map((n) => n.createdAt),
          now,
        );
        if (retryAfter > 0) {
          throw new HttpException(
            { code: 'rate_limited', title: 'Too many messages today', retryAfter },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const sender = await tx.user.findUniqueOrThrow({
          where: { id: auth.userId },
          select: { handle: true, displayName: true },
        });
        await this.notifier.notify(
          [
            {
              userId: target.id,
              type: 'contact.request',
              payload: {
                senderId: auth.userId,
                by: sender.handle,
                byName: sender.displayName,
                message: body.message,
              },
            },
          ],
          tx,
        );
        return { status: 201, body: { sentAt: now.toISOString() } };
      },
    );
    return outcome.body;
  }
}
