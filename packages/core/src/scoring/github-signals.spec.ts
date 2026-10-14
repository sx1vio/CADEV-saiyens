import { describe, expect, it } from 'vitest';
import { computeGithubSignals, type RepoForScoring } from './github-signals';
import { githubSignal, skillLevel, skillScore } from './skill-score';

const now = new Date('2026-10-08T00:00:00Z');
const recent = new Date('2026-09-01T00:00:00Z');
const old = new Date('2023-01-01T00:00:00Z');
const tags: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  python: 'py',
  dockerfile: 'docker',
  css: 'css',
  html: 'html',
  go: 'go',
};
const tagFor = (language: string) => tags[language.toLowerCase()];
const repo = (
  languages: Record<string, number>,
  over: Partial<RepoForScoring> = {},
): RepoForScoring => ({
  fork: false,
  sizeKb: 100,
  pushedAt: recent,
  languages,
  ...over,
});

describe('computeGithubSignals (X3)', () => {
  it('compte un dépôt actif où la technologie pèse au moins 20 %', () => {
    const [ts] = computeGithubSignals([repo({ TypeScript: 80, CSS: 20 })], tagFor, now);
    expect(ts).toMatchObject({ tagId: 'ts', qualifiedRepos: 1, githubSignal: 5 });
  });

  it('ignore les dépôts forkés et vides : 8 dépôts vides ne valent rien', () => {
    const empties = Array.from({ length: 8 }, () => repo({ Go: 100 }, { sizeKb: 0 }));
    const forks = Array.from({ length: 8 }, () => repo({ Go: 100 }, { fork: true }));
    expect(computeGithubSignals([...empties, ...forks], tagFor, now)).toEqual([]);
  });

  it('ne qualifie pas une technologie sous 20 % ni un dépôt de plus de 24 mois', () => {
    const signals = computeGithubSignals(
      [repo({ Python: 85, Dockerfile: 15 }), repo({ JavaScript: 100 }, { pushedAt: old })],
      tagFor,
      now,
    );
    const by = Object.fromEntries(signals.map((s) => [s.tagId, s]));
    expect(by.py?.qualifiedRepos).toBe(1);
    expect(by.docker?.qualifiedRepos).toBe(0);
    expect(by.js?.qualifiedRepos).toBe(0);
  });

  it('propose au moins 3 compétences en complétant sans points GitHub', () => {
    const signals = computeGithubSignals(
      [repo({ Python: 85, Dockerfile: 15 }), repo({ JavaScript: 100 }, { pushedAt: old })],
      tagFor,
      now,
    );
    expect(signals.map((s) => s.tagId)).toEqual(['py', 'js', 'docker']);
    expect(signals.slice(1).every((s) => s.githubSignal === 0)).toBe(true);
  });

  it('plafonne G à 40 et trie par dépôts qualifiés puis volume de code', () => {
    const many = Array.from({ length: 12 }, () => repo({ TypeScript: 100 }));
    const signals = computeGithubSignals([...many, repo({ Python: 1000 })], tagFor, now);
    expect(signals[0]).toMatchObject({ tagId: 'ts', qualifiedRepos: 12, githubSignal: 40 });
    expect(signals[1]).toMatchObject({ tagId: 'py', qualifiedRepos: 1 });
  });

  it('ignore un dépôt sans langage détecté', () => {
    expect(computeGithubSignals([repo({})], tagFor, now)).toEqual([]);
  });

  it('ne qualifie pas un dépôt sans date de dernière modification', () => {
    const [ts] = computeGithubSignals([repo({ TypeScript: 100 }, { pushedAt: null })], tagFor, now);
    expect(ts).toMatchObject({ tagId: 'ts', qualifiedRepos: 0, githubSignal: 0 });
  });

  it('ignore les langages sans étiquette connue', () => {
    expect(computeGithubSignals([repo({ Brainfuck: 100 })], tagFor, now)).toEqual([]);
  });

  it('ne compte un dépôt qu’une fois quand deux langages pointent vers la même étiquette', () => {
    const sameTag = (language: string) =>
      ['TypeScript', 'JavaScript'].includes(language) ? 'web' : undefined;
    const [web] = computeGithubSignals(
      [repo({ TypeScript: 10, JavaScript: 15, Other: 75 })],
      sameTag,
      now,
    );
    expect(web).toMatchObject({ qualifiedRepos: 1, bytes: 25 });
  });

  it('limite le nombre de propositions à 10', () => {
    const languages = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`L${i}`, 100]));
    const all = (l: string) => l;
    const repos = Array.from({ length: 15 }, (_, i) => repo({ [`L${i}`]: 100 }));
    expect(computeGithubSignals([...repos, repo(languages)], all, now)).toHaveLength(10);
  });
});

describe('score et niveau (§6.3)', () => {
  it('G vaut 5 par dépôt qualifié, plafonné à 40', () => {
    expect(githubSignal(0)).toBe(0);
    expect(githubSignal(3)).toBe(15);
    expect(githubSignal(9)).toBe(40);
  });

  it('score = min(100, G + min(60, XP))', () => {
    expect(skillScore(40, 100)).toBe(100);
    expect(skillScore(15, 20)).toBe(35);
    expect(skillScore(0, -5)).toBe(0);
  });

  it.each([
    [0, 'beginner'],
    [29, 'beginner'],
    [30, 'confirmed'],
    [59, 'confirmed'],
    [60, 'advanced'],
    [79, 'advanced'],
    [80, 'expert'],
    [100, 'expert'],
  ] as const)('score %i → %s', (score, level) => {
    expect(skillLevel(score)).toBe(level);
  });
});
