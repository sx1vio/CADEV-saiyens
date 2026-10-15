import { describe, expect, it } from 'vitest';
import { diffWords, type DiffPart } from './diff';

const side = (parts: DiffPart[], kind: 'before' | 'after') =>
  parts
    .filter((p) => p.kind === 'same' || p.kind === kind)
    .map((p) => p.text)
    .join('');

describe('diffWords', () => {
  it('textes identiques : une seule partie commune', () => {
    expect(diffWords('nginx renvoie 502', 'nginx renvoie 502')).toEqual([
      { kind: 'same', text: 'nginx renvoie 502' },
    ]);
  });

  it('isole le mot remplacé', () => {
    expect(diffWords('nginx renvoie 502 en prod', 'nginx renvoie 504 en prod')).toEqual([
      { kind: 'same', text: 'nginx renvoie ' },
      { kind: 'before', text: '502' },
      { kind: 'after', text: '504' },
      { kind: 'same', text: ' en prod' },
    ]);
  });

  it('un remplacement de plusieurs mots reste un seul bloc', () => {
    expect(diffWords('Postgres sur Windows', 'Postgres en local')).toEqual([
      { kind: 'same', text: 'Postgres ' },
      { kind: 'before', text: 'sur Windows' },
      { kind: 'after', text: 'en local' },
    ]);
  });

  it('ajout et suppression', () => {
    const parts = diffWords('le port 3000 est fermé', 'le port 3000 du conteneur est ouvert');
    expect(parts.filter((p) => p.kind === 'after').map((p) => p.text.trim())).toEqual([
      'du conteneur',
      'ouvert',
    ]);
    expect(parts.filter((p) => p.kind === 'before').map((p) => p.text.trim())).toEqual(['fermé']);
  });

  it('chaque côté se recompose à l’identique, espaces et retours compris', () => {
    const a = 'Ligne 1\n\nproxy_pass http://localhost:3000;\n  fin';
    const b = 'Ligne 1\nproxy_pass http://api:3000;\n  fin\najout';
    const parts = diffWords(a, b);
    expect(side(parts, 'before')).toBe(a);
    expect(side(parts, 'after')).toBe(b);
  });

  it('très longs textes : reste exact en comparant par ligne', () => {
    const a = Array.from({ length: 3000 }, (_, i) => `mot${i}`).join(' ');
    const b = `${a}\nune ligne de plus`;
    const parts = diffWords(a, b);
    expect(side(parts, 'before')).toBe(a);
    expect(side(parts, 'after')).toBe(b);
  });
});
