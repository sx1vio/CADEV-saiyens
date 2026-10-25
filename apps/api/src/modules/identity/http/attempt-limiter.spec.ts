import { describe, expect, it } from 'vitest';
import { AttemptLimiter } from './attempt-limiter';

describe('AttemptLimiter', () => {
  it('bloque après 10 échecs et libère après 15 minutes', () => {
    let t = 0;
    const limiter = new AttemptLimiter(() => t);
    for (let i = 0; i < 10; i++) limiter.fail('ip');
    expect(limiter.blocked('ip')).toBe(true);
    expect(limiter.blocked('autre')).toBe(false);
    t = 15 * 60 * 1000 + 1;
    expect(limiter.blocked('ip')).toBe(false);
  });
});
