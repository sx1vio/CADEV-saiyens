import type { PassportResponse } from '@devhub/contracts';
import { describe, expect, it } from 'vitest';
import { renderProofCard } from './proof-card';

const passport = (over: Partial<PassportResponse> = {}): PassportResponse =>
  ({
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      handle: 'awa',
      displayName: 'Awa Traoré',
      avatarUrl: null,
      bio: null,
      country: 'CI',
      timezone: 'Africa/Abidjan',
      languages: ['fr'],
      lookingFor: null,
      availability: null,
      isDemo: false,
      memberSince: '2026-10-08T10:00:00.000Z',
    },
    trust: {} as PassportResponse['trust'],
    skills: [
      {
        tag: { slug: 'docker', label: 'Docker' },
        score: 72,
        level: 'advanced',
        githubSignal: 20,
        githubRepos: 4,
        platformPoints: 30,
      },
    ],
    canHelp: [],
    wantLearn: [],
    stats: {
      totalXp: 1240,
      answersAccepted: 17,
      helpfulVotes: 5,
      questionsResolved: 2,
      medianMinutesToHelp: 12,
      contributions: 6,
      contributionsVerified: 4,
      reviews: 1,
    },
    projects: [],
    ...over,
  }) as PassportResponse;

describe('Proof Card (PR5)', () => {
  it('montre l’identité, les compétences calculées et les chiffres, en FR ou en EN', () => {
    const fr = renderProofCard(passport(), 'fr', 'devhub.africa');
    expect(fr).toContain('width="1200" height="630"');
    expect(fr).toContain('Awa Traoré');
    expect(fr).toContain('@awa · CI');
    expect(fr).toContain('72 · Avancé');
    expect(fr).toMatch(/1\s240 Proof XP/);
    expect(fr).toContain('devhub.africa/u/awa');
    expect(renderProofCard(passport(), 'en', 'devhub.africa')).toContain('17 devs unblocked');
  });

  it('confidentialité (PR14) : pays et chiffres masqués n’apparaissent pas', () => {
    const hidden = passport({
      user: { ...passport().user, country: null },
      stats: null,
    });
    const svg = renderProofCard(hidden, 'fr', 'devhub.africa');
    expect(svg).not.toContain('CI');
    expect(svg).not.toContain('Proof XP');
    expect(svg).not.toContain('débloqués');
  });

  it('compte démo signalé comme tel (§6.6)', () => {
    const svg = renderProofCard(
      passport({ user: { ...passport().user, isDemo: true } }),
      'fr',
      'devhub.africa',
    );
    expect(svg).toContain('Compte démo');
  });

  it('le texte saisi par l’utilisateur est échappé et coupé', () => {
    const svg = renderProofCard(
      passport({
        user: { ...passport().user, displayName: '</text><script>alert(1)</script> & co' },
      }),
      'fr',
      'devhub.africa',
    );
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;/text&gt;&lt;script&gt;');
    const long = renderProofCard(
      passport({ user: { ...passport().user, displayName: 'A'.repeat(80) } }),
      'fr',
      'devhub.africa',
    );
    expect(long).toContain(`${'A'.repeat(25)}…`);
  });
});
