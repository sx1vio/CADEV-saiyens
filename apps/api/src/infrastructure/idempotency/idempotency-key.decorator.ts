import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** En-tête Idempotency-Key obligatoire (UUID) sur les écritures : sinon 400 idempotency_key.missing. */
export const IdempotencyKey = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const value = context.switchToHttp().getRequest<Request>().header('idempotency-key');
  if (!value || !UUID.test(value)) {
    throw new BadRequestException({
      code: 'idempotency_key.missing',
      title: 'Idempotency-Key header (UUID) is required',
    });
  }
  return value.toLowerCase();
});
