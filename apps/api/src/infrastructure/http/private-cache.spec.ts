import { describe, expect, it, vi } from 'vitest';
import { isPrivateRequest, privateCacheMiddleware } from './private-cache';

describe('isPrivateRequest (SEC-04)', () => {
  it('marque le profil, l’administration et l’espace entreprise, même sans cookie', () => {
    expect(isPrivateRequest('/api/v1/me', undefined, undefined)).toBe(true);
    expect(isPrivateRequest('/api/v1/me/session', undefined, undefined)).toBe(true);
    expect(isPrivateRequest('/api/v1/admin/users', undefined, undefined)).toBe(true);
    expect(isPrivateRequest('/api/v1/business/me', undefined, undefined)).toBe(true);
  });

  it('marque toute requête d’API qui porte une session ou un jeton', () => {
    expect(isPrivateRequest('/api/v1/questions', 'theme=dark; __Host-sid=abc', undefined)).toBe(
      true,
    );
    expect(isPrivateRequest('/api/v1/rooms', undefined, 'Bearer dh_pat_x')).toBe(true);
  });

  it('laisse les lectures publiques anonymes et ce qui n’est pas l’API', () => {
    expect(isPrivateRequest('/api/v1/questions', undefined, undefined)).toBe(false);
    expect(isPrivateRequest('/api/v1/medias', 'theme=dark', undefined)).toBe(false);
    expect(isPrivateRequest('/u/chim31', '__Host-sid=abc', undefined)).toBe(false);
    expect(isPrivateRequest('/api/v1/messages', undefined, undefined)).toBe(false);
  });
});

describe('privateCacheMiddleware', () => {
  it('pose Cache-Control: private, no-store puis passe la main', () => {
    const setHeader = vi.fn();
    const next = vi.fn();
    privateCacheMiddleware(
      { originalUrl: '/api/v1/me?x=1', headers: {} } as never,
      { setHeader } as never,
      next,
    );
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(next).toHaveBeenCalled();
  });
});
