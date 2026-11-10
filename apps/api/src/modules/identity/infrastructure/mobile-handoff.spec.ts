import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  MOBILE_HANDOFF_TTL_MS,
  isCodeChallenge,
  openMobileHandoff,
  sealMobileHandoff,
} from './mobile-handoff';
import { codeChallenge } from './oauth-state';

const SECRET = 'x'.repeat(48);
const NOW = 1_800_000_000_000;
const verifier = randomBytes(32).toString('base64url');
const handoff = { sessionToken: 'session-token', sessionExpiresAt: '2026-12-01T00:00:00.000Z' };

describe('code de retour mobile', () => {
  it("rend la session avec le bon secret PKCE, sans l'exposer dans le code", () => {
    const code = sealMobileHandoff(handoff, codeChallenge(verifier), SECRET, NOW);
    expect(Buffer.from(code, 'base64url').toString('latin1')).not.toContain('session-token');
    expect(openMobileHandoff(code, verifier, SECRET, NOW + 1000)).toEqual(handoff);
  });

  it('refuse un autre secret PKCE', () => {
    const code = sealMobileHandoff(handoff, codeChallenge(verifier), SECRET, NOW);
    const other = randomBytes(32).toString('base64url');
    expect(openMobileHandoff(code, other, SECRET, NOW)).toBeNull();
  });

  it('refuse un code expiré', () => {
    const code = sealMobileHandoff(handoff, codeChallenge(verifier), SECRET, NOW);
    expect(openMobileHandoff(code, verifier, SECRET, NOW + MOBILE_HANDOFF_TTL_MS + 1)).toBeNull();
  });

  it('refuse un code altéré ou scellé avec un autre secret', () => {
    const code = sealMobileHandoff(handoff, codeChallenge(verifier), SECRET, NOW);
    const bytes = Buffer.from(code, 'base64url');
    bytes[bytes.length - 1]! ^= 1;
    expect(openMobileHandoff(bytes.toString('base64url'), verifier, SECRET, NOW)).toBeNull();
    expect(openMobileHandoff(code, verifier, 'y'.repeat(48), NOW)).toBeNull();
    expect(openMobileHandoff('court', verifier, SECRET, NOW)).toBeNull();
  });

  it("n'accepte qu'un défi S256 bien formé", () => {
    expect(isCodeChallenge(codeChallenge(verifier))).toBe(true);
    expect(isCodeChallenge('trop-court')).toBe(false);
    expect(isCodeChallenge(undefined)).toBe(false);
  });
});
