import { describe, expect, it } from 'vitest';
import {
  OAUTH_STATE_TTL_MS,
  codeChallenge,
  newOAuthState,
  openOAuthState,
  safeReturnTo,
  sealOAuthState,
} from './oauth-state';

const secret = 's'.repeat(48);
const now = 1_000_000;

describe('état OAuth signé', () => {
  it('se rouvre avec le bon state', () => {
    const state = newOAuthState('/sos/1', now);
    const sealed = sealOAuthState(state, secret);
    expect(openOAuthState(sealed, state.state, secret, now + 1000)).toEqual(state);
  });

  it('refuse un state différent', () => {
    const state = newOAuthState('/', now);
    expect(openOAuthState(sealOAuthState(state, secret), 'autre', secret, now)).toBeNull();
  });

  it('refuse un cookie altéré ou signé avec un autre secret', () => {
    const state = newOAuthState('/', now);
    const sealed = sealOAuthState(state, secret);
    const [payload, sig] = sealed.split('.');
    const forged = Buffer.from(JSON.stringify({ ...state, returnTo: '//evil' })).toString(
      'base64url',
    );
    expect(openOAuthState(`${forged}.${sig}`, state.state, secret, now)).toBeNull();
    expect(openOAuthState(`${payload}.${sig}`, state.state, 't'.repeat(48), now)).toBeNull();
    expect(openOAuthState('pas-un-cookie', state.state, secret, now)).toBeNull();
    expect(openOAuthState(undefined, state.state, secret, now)).toBeNull();
  });

  it('expire au bout de 10 minutes', () => {
    const state = newOAuthState('/', now);
    expect(
      openOAuthState(
        sealOAuthState(state, secret),
        state.state,
        secret,
        now + OAUTH_STATE_TTL_MS + 1,
      ),
    ).toBeNull();
  });

  it('calcule le défi PKCE S256 (vecteur RFC 7636)', () => {
    expect(codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
});

describe('safeReturnTo', () => {
  it('garde un chemin interne', () => {
    expect(safeReturnTo('/sos/42?x=1')).toBe('/sos/42?x=1');
  });

  it.each([['https://evil.test'], ['//evil.test'], ['/\\evil.test'], [undefined], [42]])(
    'refuse %s',
    (value) => {
      expect(safeReturnTo(value)).toBe('/');
    },
  );
});
