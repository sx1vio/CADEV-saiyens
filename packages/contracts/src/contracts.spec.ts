import { describe, expect, it } from 'vitest';
import { AskQuestionRequest, ERROR_CODES, MeResponse, MySkillsResponse, isReproUrl } from './index';

const me = {
  id: '6f1c2a8e-3b4d-4e5f-9a0b-1c2d3e4f5a6b',
  handle: 'awa-dev',
  displayName: 'Awa',
  avatarUrl: null,
  email: 'awa@example.test',
  emailVerified: true,
  emailNotifications: true,
  bio: null,
  country: 'CI',
  timezone: 'Africa/Abidjan',
  languages: ['fr'],
  uiLang: 'fr',
  lookingFor: null,
  githubLinked: true,
  githubCreatedAt: '2020-01-01T00:00:00.000Z',
  codeOfConductAcceptedAt: null,
  isAdmin: false,
  isDemo: false,
  createdAt: '2026-10-08T10:00:00.000Z',
  privacy: {
    unlisted: false,
    hideCountry: false,
    hideTimezone: false,
    hideAvailability: false,
    hideStats: false,
  },
  trust: {
    githubLinked: true,
    githubAccountYears: 6,
    emailVerified: true,
    demo: false,
    founder: true,
  },
};

describe('contrats', () => {
  it('accepte une réponse /me valide', () => {
    expect(MeResponse.parse(me)).toEqual(me);
  });

  it('refuse une réponse /me sans signaux de confiance', () => {
    const { trust: _, ...withoutTrust } = me;
    expect(MeResponse.safeParse(withoutTrust).success).toBe(false);
  });

  it('refuse un niveau de compétence inconnu', () => {
    const skills = {
      skills: [
        {
          tag: { slug: 'ts', label: 'TS' },
          score: 5,
          level: 'guru',
          githubSignal: 5,
          githubRepos: 1,
          platformPoints: 0,
        },
      ],
      lastImportedAt: null,
    };
    expect(MySkillsResponse.safeParse(skills).success).toBe(false);
  });

  it('expose des codes d’erreur uniques', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('S14 : liens de reproduction acceptés (HTTPS, liste blanche, sous-domaines)', () => {
    for (const ok of [
      'https://stackblitz.com/edit/x',
      'https://abc.stackblitz.io',
      'https://codesandbox.io/s/x?file=/a.ts',
      'https://xyz.csb.app/',
      'https://replit.com/@awa/demo',
      'https://gist.github.com/awa/1',
      'https://github.com/awa/repo/issues/1',
      'https://codepen.io/awa/pen/abc',
      'https://jsfiddle.net/awa/1/',
    ]) {
      expect(isReproUrl(ok)).toBe(true);
    }
    for (const ko of [
      'http://codesandbox.io/s/x',
      'https://evil.example.com/',
      'https://notgithub.com/x',
      'https://github.com.evil.example/x',
      'https://github.com@evil.example/x',
      'https://github.com:8443/x',
      'https://.github.com/x',
      'javascript:alert(1)',
      'https://github.com/a b',
    ]) {
      expect(isReproUrl(ko)).toBe(false);
    }
  });

  it('S14 : le lien est facultatif, vide = absent, et limité en longueur', () => {
    const base = {
      clientId: '00000000-0000-4000-8000-000000000001',
      title: 'Une question assez longue',
      body: 'corps',
      tagSlugs: ['docker'],
      lang: 'fr',
    };
    expect(AskQuestionRequest.parse({ ...base, reproUrl: '  ' }).reproUrl).toBeNull();
    expect(AskQuestionRequest.parse(base).reproUrl).toBeUndefined();
    const long = `https://github.com/${'a'.repeat(600)}`;
    expect(AskQuestionRequest.safeParse({ ...base, reproUrl: long }).success).toBe(false);
  });
});
