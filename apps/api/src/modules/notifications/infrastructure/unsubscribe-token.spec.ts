import { describe, expect, it } from 'vitest';
import { unsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token';

const secret = 's'.repeat(48);
const id = '8f0c2b1e-0000-4000-8000-000000000000';

describe('jeton de désabonnement (Y3)', () => {
  it('authentique : rend le compte ; modifié, d’un autre compte ou d’une autre clé : refusé', () => {
    const token = unsubscribeToken(secret, id);
    expect(verifyUnsubscribeToken(secret, token)).toBe(id);
    expect(verifyUnsubscribeToken('t'.repeat(48), token)).toBeNull();
    const other = '9f0c2b1e-0000-4000-8000-000000000000';
    expect(verifyUnsubscribeToken(secret, `${other}.${token.split('.')[1]}`)).toBeNull();
    expect(verifyUnsubscribeToken(secret, `${token}x`)).toBeNull();
    expect(verifyUnsubscribeToken(secret, 'pas-un-jeton')).toBeNull();
  });
});
