import { TAG_REFERENCE } from '@devhub/core';
import { describe, expect, it } from 'vitest';
import { TAG_PATTERNS, detectTags } from './detect';

describe('étiquettes détectées depuis l’erreur (S9)', () => {
  it('ne propose que des étiquettes du référentiel de l’API', () => {
    const known = new Set(TAG_REFERENCE.map((t) => t.slug));
    const unknown = TAG_PATTERNS.flatMap((p) => p.tags).filter((slug) => !known.has(slug));
    expect(unknown).toEqual([]);
  });

  it('reconnaît une trace d’erreur courante', () => {
    expect(detectTags('Traceback (most recent call last):\nModuleNotFoundError: pandas')).toEqual([
      'python',
    ]);
    expect(detectTags('PrismaClientInitializationError: P1001 can’t reach database')).toEqual([
      'nodejs',
      'sql',
    ]);
    expect(detectTags('WebSocket connection to ws://localhost:3000 failed')).toEqual([
      'javascript',
    ]);
  });
});

describe('faux positifs (S9)', () => {
  it('une erreur Python d’import n’est pas une erreur Node.js', () => {
    expect(detectTags('ModuleNotFoundError: No module named requests')).not.toContain('nodejs');
    expect(detectTags('Error: getaddrinfo ENOTFOUND db')).toContain('nodejs');
  });
});
