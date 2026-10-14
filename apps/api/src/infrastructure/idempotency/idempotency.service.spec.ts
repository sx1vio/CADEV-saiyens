import { describe, expect, it } from 'vitest';
import { requestHash } from './idempotency.service';

describe('requestHash (idempotence)', () => {
  it('ne dépend pas de l’ordre des clés', () => {
    expect(requestHash('POST /questions', { a: 1, b: { c: 2, d: [1, 2] } })).toBe(
      requestHash('POST /questions', { b: { d: [1, 2], c: 2 }, a: 1 }),
    );
  });

  it('change avec le corps, l’ordre d’une liste ou la route', () => {
    const base = requestHash('POST /questions', { tags: ['a', 'b'] });
    expect(requestHash('POST /questions', { tags: ['b', 'a'] })).not.toBe(base);
    expect(requestHash('POST /questions', { tags: ['a'] })).not.toBe(base);
    expect(requestHash('POST /answers', { tags: ['a', 'b'] })).not.toBe(base);
  });
});
