import { describe, expect, it } from 'vitest';
import { maskDraft, maskReproUrl, retryAfterSeconds } from './question';

// Faux secrets construits à l'exécution (BUG-012) : jamais de littéral au format réel dans le dépôt.
const fakeGithub = ['ghp', 'a1'.repeat(18)].join('_');
const fakeAnthropic = ['sk', 'ant', 'api03', 'b2'.repeat(15)].join('-');

describe('maskDraft (§6.1, O9)', () => {
  it('masque les secrets du titre, du corps et de l’extrait, et les compte', () => {
    const { draft, secretsMasked } = maskDraft({
      title: `Erreur avec ${fakeGithub}`,
      body: 'Ma chaîne : postgres://app:MotDePasse42@db:5432/app',
      codeSnippet: `API_KEY=${fakeAnthropic}`,
    });
    expect(secretsMasked).toBe(3);
    const stored = JSON.stringify(draft);
    for (const secret of [fakeGithub, 'MotDePasse42', fakeAnthropic]) {
      expect(stored).not.toContain(secret);
    }
  });

  it('un extrait vide devient null', () => {
    expect(maskDraft({ title: 't', body: 'b', codeSnippet: '   ' }).draft.codeSnippet).toBeNull();
  });
});

describe('retryAfterSeconds (anti-spam, 10 questions par heure)', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it('sous la limite : 0', () => {
    expect(retryAfterSeconds([minutesAgo(5)], 10, now)).toBe(0);
  });

  it('à la limite : attendre que la plus ancienne des 10 sorte de la fenêtre', () => {
    const recent = [50, 45, 40, 30, 25, 20, 15, 10, 5, 1].map(minutesAgo);
    expect(retryAfterSeconds(recent, 10, now)).toBe(10 * 60);
  });
});

describe('maskReproUrl (S14)', () => {
  it('garde un lien sans secret tel quel', () => {
    const url = 'https://stackblitz.com/edit/demo?file=src/main.ts';
    expect(maskReproUrl(url)).toEqual({ url, count: 0 });
  });

  it('retire la requête et l’ancre quand elles portent un secret', () => {
    expect(maskReproUrl(`https://gist.github.com/awa/1?token=${fakeGithub}#x`)).toEqual({
      url: 'https://gist.github.com/awa/1',
      count: 1,
    });
  });

  it('retire le lien si le chemin lui-même contient un secret', () => {
    expect(maskReproUrl(`https://github.com/awa/${fakeGithub}`).url).toBeNull();
  });

  it('absent ou vide : null', () => {
    expect(maskReproUrl(null)).toEqual({ url: null, count: 0 });
    expect(maskReproUrl(undefined)).toEqual({ url: null, count: 0 });
  });
});
