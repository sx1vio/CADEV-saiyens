import { describe, expect, it } from 'vitest';
import { FOUNDER_DEADLINE, trustSignals } from './trust';

const now = new Date('2026-10-08T12:00:00Z');
const base = {
  githubId: 42n,
  githubCreatedAt: new Date('2020-10-09T00:00:00Z'),
  emailVerified: true,
  isDemo: false,
  createdAt: new Date('2026-10-07T10:00:00Z'),
};

describe('trustSignals (PR11)', () => {
  it('compte les années révolues du compte GitHub', () => {
    expect(trustSignals(base, now).githubAccountYears).toBe(5); // 6 ans demain
    expect(
      trustSignals({ ...base, githubCreatedAt: new Date('2020-10-08T00:00:00Z') }, now)
        .githubAccountYears,
    ).toBe(6);
    expect(
      trustSignals({ ...base, githubCreatedAt: new Date('2026-09-01T00:00:00Z') }, now)
        .githubAccountYears,
    ).toBe(0);
  });

  it('signale l’absence de compte GitHub lié', () => {
    expect(trustSignals({ ...base, githubId: null, githubCreatedAt: null }, now)).toMatchObject({
      githubLinked: false,
      githubAccountYears: null,
    });
  });

  it('attribue « fondateur » aux inscrits avant le 22 octobre seulement', () => {
    expect(trustSignals(base, now).founder).toBe(true);
    expect(trustSignals({ ...base, createdAt: FOUNDER_DEADLINE }, now).founder).toBe(false);
  });

  it('ne donne jamais le badge fondateur à un compte de démonstration', () => {
    expect(trustSignals({ ...base, isDemo: true }, now)).toMatchObject({
      demo: true,
      founder: false,
    });
  });

  it('reprend la vérification de l’e-mail', () => {
    expect(trustSignals({ ...base, emailVerified: false }, now).emailVerified).toBe(false);
  });
});
