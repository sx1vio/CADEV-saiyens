import { describe, expect, it } from 'vitest';
import { sanitize } from './sanitize';

const token = 'ghp_' + 'a'.repeat(36);
const dsn = 'postgres://app:MotDePasse42@db/app';

describe('secrets masqués avant la file hors ligne (O9, BUG-040)', () => {
  it('masque chaque champ texte d’une question, facultatifs compris', () => {
    const out = sanitize({
      type: 'question',
      payload: {
        title: `push refusé avec ${token}`,
        body: 'Le push échoue.',
        tried: `export GITHUB_TOKEN=${token}`,
        expected: `connexion à ${dsn}`,
        environment: `DATABASE_URL=${dsn}`,
        codeSnippet: 'git push',
        reproUrl: `https://gist.github.com/x?token=${token}`,
        codeLang: 'bash',
        urgency: 'normal',
        tagIds: ['git'],
      },
    });
    const written = JSON.stringify(out);
    expect(written).not.toContain(token);
    expect(written).not.toContain('MotDePasse42');
    expect(out.type === 'question' && out.payload.body).toBe('Le push échoue.');
  });

  it('laisse absents les champs facultatifs non remplis', () => {
    const out = sanitize({
      type: 'question',
      payload: {
        title: 'nginx renvoie 502',
        body: 'Détails',
        codeSnippet: '',
        codeLang: 'text',
        urgency: 'normal',
        tagIds: ['nginx'],
      },
    });
    expect(out.type === 'question' && 'tried' in out.payload && out.payload.tried).toBeFalsy();
    expect(out.type === 'question' && out.payload.title).toBe('nginx renvoie 502');
  });

  it('masque aussi le titre d’une question modifiée', () => {
    const out = sanitize({
      type: 'edit-question',
      payload: {
        questionId: 'q1',
        baseVersion: 1,
        title: `clé ${token}`,
        body: dsn,
        codeSnippet: '',
      },
    });
    expect(JSON.stringify(out)).not.toContain(token);
    expect(JSON.stringify(out)).not.toContain('MotDePasse42');
  });
});
