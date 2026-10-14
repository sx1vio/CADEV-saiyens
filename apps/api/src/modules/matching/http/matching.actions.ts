import { ForbiddenException, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClaimResponse } from '@devhub/contracts';
import { z } from 'zod';
import {
  type ActionDefinition,
  ActionRegistry,
} from '../../../infrastructure/actions/action-registry';
import { ClaimQuestion, NotSolicitedError } from '../application/run-wave';

const ClaimPayload = z.object({ questionId: z.uuid() });

/** « Je m'en occupe » (S11), partagé par son endpoint et par POST /sync. */
@Injectable()
export class MatchingActions implements OnModuleInit {
  constructor(
    private readonly registry: ActionRegistry,
    private readonly claimQuestion: ClaimQuestion,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.questionClaim);
  }

  readonly questionClaim: ActionDefinition<z.infer<typeof ClaimPayload>> = {
    type: 'question.claim',
    schema: ClaimPayload,
    refs: [{ field: 'questionId', kind: 'question' }],
    endpoint: (p) => `POST /questions/${p.questionId}/claim`,
    body: () => ({}),
    execute: async (tx, userId, p) => {
      try {
        const { claimedAt } = await this.claimQuestion.execute(p.questionId, userId, tx);
        const body: ClaimResponse = {
          questionId: p.questionId,
          claimedAt: claimedAt.toISOString(),
        };
        return { status: 200, body };
      } catch (err) {
        if (err instanceof NotSolicitedError) {
          throw new ForbiddenException({
            code: 'forbidden',
            title: 'Only a solicited helper can claim an open question',
          });
        }
        throw err;
      }
    },
  };
}
