import { describe, expect, it } from 'vitest';
import { HINT_INPUT_LIMITS, hintInputHash, prepareHintInput } from './hint-input';
import type { HintQuestion } from './ports';

const question = (over: Partial<HintQuestion> = {}): HintQuestion => ({
  id: 'q1',
  authorId: 'u1',
  title: 'Docker : connexion refusée vers Postgres',
  body: 'Mon conteneur API ne joint pas la base.',
  codeSnippet: 'DATABASE_URL=postgres://app:SuperSecret123@db:5432/app',
  lang: 'fr',
  tags: ['Docker', 'PostgreSQL'],
  aiStatus: 'pending',
  ...over,
});

describe('prepareHintInput (S2, O9)', () => {
  it('masque les secrets avant tout envoi au modèle', () => {
    const input = prepareHintInput(
      question({ body: 'Ma clé : sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123' }),
    );
    expect(input.code).not.toContain('SuperSecret123');
    expect(input.body).not.toContain('sk-ant-api03');
    expect(input.maskedSecrets).toBe(2);
  });

  it('normalise les étiquettes et plafonne les tailles', () => {
    const input = prepareHintInput(
      question({ tags: ['Docker', 'docker ', 'Nginx'], body: 'x'.repeat(10_000) }),
    );
    expect(input.tags).toEqual(['docker', 'nginx']);
    expect(input.body.length).toBeLessThan(HINT_INPUT_LIMITS.body + 20);
    expect(input.body).toContain('[… tronqué]');
  });

  it('sans extrait de code, code vaut null', () => {
    expect(prepareHintInput(question({ codeSnippet: '  ' })).code).toBeNull();
  });
});

describe('hintInputHash (cache §8)', () => {
  it('ne dépend ni de l’ordre des étiquettes, ni des fins de ligne', () => {
    const a = prepareHintInput(question({ tags: ['Docker', 'PostgreSQL'], body: 'a\r\nb' }));
    const b = prepareHintInput(question({ tags: ['postgresql', 'docker'], body: 'a\nb' }));
    expect(hintInputHash(a)).toBe(hintInputHash(b));
  });

  it('change avec la langue ou le contenu', () => {
    const base = hintInputHash(prepareHintInput(question()));
    expect(hintInputHash(prepareHintInput(question({ lang: 'en' })))).not.toBe(base);
    expect(hintInputHash(prepareHintInput(question({ title: 'Autre' })))).not.toBe(base);
  });
});
