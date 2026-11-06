import { CERT_CATALOG } from '@devhub/core';
import { describe, expect, it } from 'vitest';
import { BANK } from '.';

// Garde-fous sur la banque : une erreur de saisie ne doit jamais rendre une question d'examen
// fausse, et le catalogue public du front doit correspondre à la banque du serveur.

describe('banque des certifications DevHub', () => {
  it('a des identifiants de certification et de question uniques', () => {
    const ids = BANK.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const questionIds = BANK.flatMap((c) => c.questions.map((q) => q.id));
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });

  it('correspond au catalogue public (@devhub/core), sans réponse dedans', () => {
    expect(CERT_CATALOG.map((c) => c.id)).toEqual(BANK.map((c) => c.id));
    for (const bank of BANK) {
      const meta = CERT_CATALOG.find((c) => c.id === bank.id)!;
      const { questions, ...rest } = bank;
      expect(meta).toEqual({
        ...rest,
        topicCounts: bank.syllabus.map((_, t) => questions.filter((q) => q.topic === t).length),
        bankSize: questions.length,
      });
    }
    expect(JSON.stringify(CERT_CATALOG)).not.toContain('"answer"');
  });

  for (const cert of BANK) {
    it(`${cert.id} : banque complète, chaque thème couvert, réponses valides`, () => {
      expect(cert.questions.length).toBeGreaterThanOrEqual(cert.draw);
      expect(cert.passScore).toBeGreaterThanOrEqual(70);
      for (let t = 0; t < cert.syllabus.length; t++)
        expect(
          cert.questions.some((q) => q.topic === t),
          `thème ${t} sans question`,
        ).toBe(true);
      const seen = new Set<string>();
      for (const q of cert.questions) {
        expect(seen.has(q.q), `question en double : ${q.q}`).toBe(false);
        seen.add(q.q);
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
        expect(q.choices.length).toBeLessThanOrEqual(10);
        expect(new Set(q.choices).size, `choix en double : ${q.q}`).toBe(q.choices.length);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.choices.length);
        expect(q.topic).toBeGreaterThanOrEqual(0);
        expect(q.topic).toBeLessThan(cert.syllabus.length);
        expect(q.explain.length).toBeGreaterThan(10);
      }
    });
  }
});
