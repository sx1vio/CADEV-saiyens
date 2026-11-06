import { describe, expect, it } from 'vitest';
import { BANK } from '../bank';
import { certificateCode, drawExam, grade, isActive, nextAttemptAt, SUBMIT_GRACE_MS } from './exam';

const bank = BANK[0]!;
const HOUR = 60 * 60 * 1000;

describe('tirage d’un examen', () => {
  it('tire `draw` questions distinctes, au moins une par thème, choix permutés', () => {
    for (let run = 0; run < 20; run++) {
      const drawn = drawExam(bank);
      expect(drawn).toHaveLength(bank.draw);
      expect(new Set(drawn.map((d) => d.id)).size).toBe(bank.draw);
      const topics = new Set(drawn.map((d) => bank.questions.find((q) => q.id === d.id)!.topic));
      expect(topics.size).toBe(bank.syllabus.length);
      for (const d of drawn) {
        const q = bank.questions.find((x) => x.id === d.id)!;
        expect([...d.order].sort()).toEqual(q.choices.map((_, i) => i));
      }
    }
  });
});

describe('correction', () => {
  const drawn = drawExam(bank);
  const right = drawn.map((d) =>
    d.order.indexOf(bank.questions.find((q) => q.id === d.id)!.answer),
  );

  it('compte juste avec l’ordre affiché et renvoie les réponses en index d’origine', () => {
    const r = grade(bank, drawn, right);
    expect(r).toMatchObject({ good: bank.draw, total: bank.draw, score: 100, passed: true });
    expect(r.original).toEqual(drawn.map((d) => bank.questions.find((q) => q.id === d.id)!.answer));
    expect(r.topics.reduce((s, t) => s + t.total, 0)).toBe(bank.draw);
  });

  it('applique le seuil et traite les réponses absentes ou hors limites comme vides', () => {
    const answers = right.map((a, i) => (i < 14 ? a : 99));
    const r = grade(bank, drawn, answers);
    expect(r.score).toBe(70);
    expect(r.passed).toBe(false);
    expect(r.corrections[19]!.given).toBeNull();
    expect(grade(bank, drawn, []).score).toBe(0);
  });
});

describe('délai entre deux tentatives', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const at = (ms: number) => new Date(now.getTime() + ms);

  it('impose une heure après un échec, rien après une réussite', () => {
    const failed = {
      startedAt: at(-40 * 60_000),
      deadline: at(-10 * 60_000),
      submittedAt: at(-20 * 60_000),
      passed: false,
    };
    expect(nextAttemptAt(failed, now)).toEqual(at(40 * 60_000));
    expect(nextAttemptAt({ ...failed, passed: true }, now)).toBeNull();
    expect(nextAttemptAt({ ...failed, submittedAt: at(-2 * HOUR) }, now)).toBeNull();
    expect(nextAttemptAt(null, now)).toBeNull();
  });

  it('compte une tentative abandonnée comme un échec à la fin de son chrono', () => {
    const abandoned = {
      startedAt: at(-40 * 60_000),
      deadline: at(-10 * 60_000),
      submittedAt: null,
      passed: null,
    };
    expect(isActive(abandoned, now)).toBe(false);
    expect(nextAttemptAt(abandoned, now)).toEqual(at(50 * 60_000));
    const running = { ...abandoned, deadline: at(SUBMIT_GRACE_MS / 2) };
    expect(isActive(running, now)).toBe(true);
    expect(nextAttemptAt(running, now)).toBeNull();
  });
});

describe('code de vérification', () => {
  it('a la forme DH-XXXX-XXXX-XXXX sans caractères ambigus', () => {
    for (let i = 0; i < 50; i++)
      expect(certificateCode('web-fondamentaux')).toMatch(
        /^DH-WEB-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/,
      );
    expect(certificateCode('ia-usage-responsable')).toMatch(/^DH-IA-/);
  });
});
