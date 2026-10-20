import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFeedbackRequest } from '@devhub/contracts';
import { z } from 'zod';
import type { ActionDefinition } from '../../../infrastructure/actions/action-registry';
import type { WriteResult } from '../../../infrastructure/idempotency/idempotency.service';
import { publishToTopic } from '../../../infrastructure/realtime/realtime.publisher';
import { FeedbackRequests } from '../application/feedback';
import {
  FeedbackAlreadyOpenError,
  FeedbackAlreadyTakenError,
  FeedbackInvalidStatusError,
  FeedbackNotFoundError,
  FeedbackSelfReviewError,
  NotFeedbackRequesterError,
} from '../domain/feedback';
import { PrismaFeedbackWriter } from '../infrastructure/prisma-feedback.writer';
import { toHttp as taskErrors } from './tasks.actions';

/** Erreurs des demandes de retour, puis celles des tâches et des salles. */
export function toHttp(err: unknown): never {
  if (err instanceof FeedbackNotFoundError) {
    throw new NotFoundException({ code: 'not_found', title: 'Feedback request not found' });
  }
  if (err instanceof FeedbackAlreadyOpenError) {
    throw new ConflictException({
      code: 'feedback.already_open',
      title: 'You already have a pending request of this kind in this room',
    });
  }
  if (err instanceof FeedbackAlreadyTakenError) {
    throw new ConflictException({
      code: 'feedback.already_taken',
      title: 'Someone is already reviewing this request',
    });
  }
  if (err instanceof FeedbackSelfReviewError) {
    throw new ForbiddenException({
      code: 'feedback.self_review',
      title: 'You cannot review your own request',
    });
  }
  if (err instanceof NotFeedbackRequesterError) {
    throw new ForbiddenException({
      code: 'forbidden',
      title: 'Only the requester can do this',
    });
  }
  if (err instanceof FeedbackInvalidStatusError) {
    throw new ConflictException({
      code: 'feedback.invalid_status',
      title: 'Not possible in the current status of the request',
    });
  }
  return taskErrors(err);
}

const id = z.uuid();
const Create = CreateFeedbackRequest.extend({ roomId: id });
const Target = z.object({ id });

const topic = (roomId: string) => `room:${roomId}`;

/** Écritures des demandes de retour et de revue de code (R6). */
@Injectable()
export class FeedbackActions {
  constructor(private readonly feedback: FeedbackRequests) {}

  readonly create: ActionDefinition<z.infer<typeof Create>> = {
    type: 'feedback_request.create',
    schema: Create,
    endpoint: (p) => `POST /rooms/${p.roomId}/feedback-requests`,
    body: ({ roomId: _r, ...rest }) => rest,
    execute: async (tx, userId, p): Promise<WriteResult<{ id: string }>> => {
      try {
        const created = await this.feedback.create(new PrismaFeedbackWriter(tx), tx, {
          roomId: p.roomId,
          actorId: userId,
          kind: p.kind,
          url: p.url ?? null,
          note: p.note ?? null,
        });
        await publishToTopic(tx, topic(p.roomId), 'feedback.updated', {
          roomId: p.roomId,
          feedbackRequestId: created.id,
        });
        return { status: HttpStatus.CREATED, body: created };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  readonly take: ActionDefinition<z.infer<typeof Target>> = {
    type: 'feedback_request.take',
    schema: Target,
    endpoint: (p) => `POST /feedback-requests/${p.id}/take`,
    body: () => ({}),
    execute: async (tx, userId, p): Promise<WriteResult<{ id: string }>> => {
      try {
        const { roomId } = await this.feedback.take(new PrismaFeedbackWriter(tx), tx, {
          id: p.id,
          actorId: userId,
        });
        await publishToTopic(tx, topic(roomId), 'feedback.updated', {
          roomId,
          feedbackRequestId: p.id,
        });
        return { status: HttpStatus.OK, body: { id: p.id } };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  readonly confirm: ActionDefinition<z.infer<typeof Target>> = {
    type: 'feedback_request.confirm',
    schema: Target,
    endpoint: (p) => `POST /feedback-requests/${p.id}/confirm`,
    body: () => ({}),
    execute: async (
      tx,
      userId,
      p,
    ): Promise<
      WriteResult<{ id: string; points: number; withheld: Array<{ kind: string; reason: string }> }>
    > => {
      try {
        const out = await this.feedback.confirm(new PrismaFeedbackWriter(tx), tx, {
          id: p.id,
          actorId: userId,
        });
        await publishToTopic(tx, topic(out.roomId), 'feedback.updated', {
          roomId: out.roomId,
          feedbackRequestId: p.id,
        });
        return {
          status: HttpStatus.OK,
          body: { id: p.id, points: out.points, withheld: out.withheld },
        };
      } catch (err) {
        return toHttp(err);
      }
    },
  };

  readonly cancel: ActionDefinition<z.infer<typeof Target>> = {
    type: 'feedback_request.cancel',
    schema: Target,
    endpoint: (p) => `POST /feedback-requests/${p.id}/cancel`,
    body: () => ({}),
    execute: async (tx, userId, p): Promise<WriteResult<{ id: string }>> => {
      try {
        const { roomId } = await this.feedback.cancel(new PrismaFeedbackWriter(tx), tx, {
          id: p.id,
          actorId: userId,
        });
        await publishToTopic(tx, topic(roomId), 'feedback.updated', {
          roomId,
          feedbackRequestId: p.id,
        });
        return { status: HttpStatus.OK, body: { id: p.id } };
      } catch (err) {
        return toHttp(err);
      }
    },
  };
}
