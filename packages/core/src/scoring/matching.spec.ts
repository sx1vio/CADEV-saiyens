import { describe, expect, it } from 'vitest';
import {
  MATCHING,
  type MatchCandidate,
  type MatchQuestion,
  availabilityAt,
  isEligible,
  pickHelpers,
  regimeFor,
  scoreHelper,
  timezoneOffsetMinutes,
  timezoneTerm,
} from './matching';

const question: MatchQuestion = { tagIds: ['docker', 'nginx'], lang: 'fr', authorOffsetMinutes: 0 };

const candidate = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  userId: 'moussa',
  acceptedAnswerTagIds: [],
  skillTagIds: ['docker'],
  githubSignalByTag: {},
  canHelpTagIds: [],
  offsetMinutes: 0,
  availability: 'none',
  totalXp: 0,
  languages: ['fr'],
  recentRequests: 0,
  lastRequestedAt: null,
  ...over,
});

describe('regimeFor (X4)', () => {
  it('démarrage à froid sous 50 réponses validées', () => {
    expect(regimeFor(49)).toBe('cold_start');
    expect(regimeFor(50)).toBe('normal');
  });
});

describe('timezoneTerm', () => {
  it.each([
    [0, 60, 1],
    [0, 180, 0.7],
    [0, 181, 0.3],
    [null, 0, 0.3],
    [0, null, 0.3],
  ])('écart %s / %s → %s', (a, b, expected) => {
    expect(timezoneTerm(a, b)).toBe(expected);
  });
});

describe('isEligible', () => {
  it('exige une étiquette commune (compétence ou « Je peux aider »)', () => {
    expect(isEligible(question, candidate())).toBe(true);
    expect(isEligible(question, candidate({ skillTagIds: [], canHelpTagIds: ['nginx'] }))).toBe(
      true,
    );
    expect(isEligible(question, candidate({ skillTagIds: ['go'] }))).toBe(false);
  });

  it('exclut un dev déjà sollicité 5 fois en 24 h', () => {
    expect(isEligible(question, candidate({ recentRequests: MATCHING.maxRequestsPer24h }))).toBe(
      false,
    );
  });
});

describe('scoreHelper', () => {
  it('régime normal : applique le §6.2 terme par terme', () => {
    const scored = scoreHelper(
      question,
      candidate({
        acceptedAnswerTagIds: [['docker'], ['docker', 'nginx'], ['go']],
        skillTagIds: ['docker', 'nginx'],
        availability: 'now',
        totalXp: 1000,
      }),
      'normal',
    );
    // E = (0,5 + 1) / 10 = 0,15 ; S = 1 ; F = 1 ; D = 1 ; R = 1 ; L = 1
    expect(scored.terms).toEqual({ E: 0.15, S: 1, F: 1, D: 1, R: 1, L: 1 });
    expect(scored.score).toBe(70.25);
    expect(scored.reasons).toEqual([
      { code: 'solved_similar', params: { count: 2, tagIds: ['docker', 'nginx'] } },
      { code: 'same_timezone', params: {} },
    ]);
  });

  it('démarrage à froid : E’ remplace E par le signal GitHub, avec la raison « dépôts »', () => {
    const scored = scoreHelper(
      question,
      candidate({ githubSignalByTag: { docker: 20, nginx: 40 }, offsetMinutes: 300 }),
      'cold_start',
    );
    expect(scored.terms.E).toBe(0.5);
    expect(scored.reasons[0]).toEqual({
      code: 'github_repos',
      params: { count: 8, tagId: 'nginx' },
    });
  });

  it('« Je peux aider » ajoute 5 points et sa raison ; raisons plafonnées à 2', () => {
    const base = scoreHelper(question, candidate({ availability: 'now' }), 'normal');
    const helping = scoreHelper(
      question,
      candidate({ availability: 'now', canHelpTagIds: ['nginx'] }),
      'normal',
    );
    expect(helping.score - base.score).toBeCloseTo(MATCHING.canHelpBonus);
    expect(helping.reasons.map((r) => r.code)).toEqual(['can_help', 'same_timezone']);
  });

  it('langue : 1 si parlée, 0,5 avec traduction (raison « traduit »), 0 sinon', () => {
    const english = candidate({ languages: ['en'], offsetMinutes: 600 });
    expect(scoreHelper(question, english, 'normal').terms.L).toBe(0);
    const translated = scoreHelper(question, english, 'normal', true);
    expect(translated.terms.L).toBe(0.5);
    expect(translated.reasons).toEqual([{ code: 'translated', params: { lang: 'fr' } }]);
  });

  it('disponible plus tard : 0,5 ; réputation négative ramenée à 0', () => {
    const s = scoreHelper(
      question,
      candidate({ availability: 'later_today', totalXp: -10 }),
      'normal',
    );
    expect(s.terms.D).toBe(0.5);
    expect(s.terms.R).toBe(0);
  });

  it('« Disponible maintenant » apparaît quand le fuseau ne fait pas déjà partie des raisons', () => {
    const s = scoreHelper(
      question,
      candidate({ availability: 'now', offsetMinutes: 600 }),
      'normal',
    );
    expect(s.reasons).toEqual([{ code: 'available_now', params: {} }]);
  });
});

describe('pickHelpers', () => {
  it('retient les 3 meilleurs éligibles, à égalité le moins sollicité récemment', () => {
    const old = new Date('2026-10-01T00:00:00Z');
    const recent = new Date('2026-10-14T00:00:00Z');
    const picked = pickHelpers(
      question,
      [
        candidate({ userId: 'a', lastRequestedAt: recent }),
        candidate({ userId: 'b', lastRequestedAt: old }),
        candidate({ userId: 'c' }),
        candidate({ userId: 'd', skillTagIds: ['go'] }),
        candidate({ userId: 'e', skillTagIds: ['docker', 'nginx'] }),
        candidate({ userId: 'f' }),
      ],
      'normal',
    );
    // e a le meilleur score ; c et f n'ont jamais été sollicités (ordre alphabétique) ; puis b, puis a.
    expect(picked.map((p) => p.userId)).toEqual(['e', 'c', 'f']);
    expect(
      pickHelpers(
        question,
        [
          candidate({ userId: 'a', lastRequestedAt: recent }),
          candidate({ userId: 'b', lastRequestedAt: old }),
        ],
        'normal',
      ).map((p) => p.userId),
    ).toEqual(['b', 'a']);
  });

  it('aucun éligible : liste vide (la question est ouverte à toute la stack)', () => {
    expect(pickHelpers(question, [candidate({ skillTagIds: [] })], 'cold_start')).toEqual([]);
  });
});

describe('timezoneOffsetMinutes', () => {
  const at = new Date('2026-10-14T12:00:30Z');
  it.each([
    ['Africa/Abidjan', 0],
    ['Africa/Lagos', 60],
    ['Africa/Nairobi', 180],
  ])('%s → %s min', (tz, expected) => {
    expect(timezoneOffsetMinutes(tz, at)).toBe(expected);
  });

  it('fuseau absent ou inconnu : null', () => {
    expect(timezoneOffsetMinutes(null, at)).toBeNull();
    expect(timezoneOffsetMinutes('Mars/Olympus', at)).toBeNull();
  });
});

describe('availabilityAt', () => {
  // Mardi 14 octobre 2026, 17:30 UTC.
  const now = new Date('2026-10-14T17:30:00Z');

  it('drapeau « maintenant », jusqu’à son expiration', () => {
    expect(availabilityAt({ now: true }, 0, now)).toBe('now');
    expect(availabilityAt({ now: true, until: '2026-10-14T18:00:00Z' }, 0, now)).toBe('now');
    expect(availabilityAt({ now: true, until: '2026-10-14T17:00:00Z' }, 0, now)).toBe('none');
  });

  it('créneau en cours, plus tard aujourd’hui, ou aucun', () => {
    const slots = (from: string, to: string, day = 3) => ({ slots: [{ day, from, to }] });
    expect(availabilityAt(slots('17:00', '18:00'), 0, now)).toBe('now');
    expect(availabilityAt(slots('20:00', '21:00'), 0, now)).toBe('later_today');
    expect(availabilityAt(slots('09:00', '12:00'), 0, now)).toBe('none');
    expect(availabilityAt(slots('17:00', '18:00', 4), 0, now)).toBe('none');
  });

  it('les créneaux sont lus dans le fuseau du dev', () => {
    // 17:30 UTC = 20:30 à Nairobi (UTC+3).
    expect(availabilityAt({ slots: [{ day: 3, from: '20:00', to: '21:00' }] }, 180, now)).toBe(
      'now',
    );
    expect(availabilityAt({ slots: [{ day: 3, from: '17:00', to: '18:00' }] }, null, now)).toBe(
      'now',
    );
  });

  it('heure invalide : lue comme minuit', () => {
    expect(availabilityAt({ slots: [{ day: 3, from: 'xx', to: '23:59' }] }, 0, now)).toBe('now');
  });

  it('sans réglages ni créneaux : indisponible', () => {
    expect(availabilityAt(null, 0, now)).toBe('none');
    expect(availabilityAt({}, 0, now)).toBe('none');
    expect(availabilityAt({ slots: [{ day: 3, from: '20', to: '21' }] }, 0, now)).toBe(
      'later_today',
    );
  });
});
