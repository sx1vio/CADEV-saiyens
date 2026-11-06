import { describe, expect, it } from 'vitest';
import { MARKET_CERTS } from './certs';
import { COURSE_META, loadCourse } from './courses';

// Garde-fous sur le contenu rédigé : une erreur de saisie ne doit jamais rendre un exercice
// impossible. La banque des examens DevHub est vérifiée côté API (modules/certifications).

describe('certifications officielles', () => {
  it('renvoient toutes vers une page https et ont des identifiants uniques', () => {
    const ids = MARKET_CERTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of MARKET_CERTS) {
      expect(c.url, c.id).toMatch(/^https:\/\//);
      if (c.prep) expect(c.prep.url, c.id).toMatch(/^https:\/\//);
      expect(c.price.length, c.id).toBeGreaterThan(0);
    }
  });
});

describe('cours façon Duolingo', () => {
  for (const meta of COURSE_META) {
    it(`${meta.id} : 4 unités de 3 leçons, exercices jouables`, async () => {
      const course = (await loadCourse(meta.id))!;
      expect(course.units).toHaveLength(4);
      const lessonIds = new Set<string>();
      for (const u of course.units) {
        expect(u.lessons).toHaveLength(3);
        for (const l of u.lessons) {
          expect(lessonIds.has(l.id), `leçon en double : ${l.id}`).toBe(false);
          lessonIds.add(l.id);
          expect(l.steps[0]?.kind, `${l.id} commence par une fiche`).toBe('tip');
          expect(l.steps.filter((s) => s.kind !== 'tip').length).toBeGreaterThanOrEqual(4);
          for (const s of l.steps) {
            const where = `${meta.id}/${l.id}`;
            switch (s.kind) {
              case 'choice':
                expect(s.answer, where).toBeLessThan(s.choices.length);
                expect(new Set(s.choices).size, where).toBe(s.choices.length);
                break;
              case 'fill':
                expect(s.code.split('___').length, `${where} : un seul trou`).toBe(2);
                expect(s.options, where).toContain(s.answer);
                expect(new Set(s.options).size, where).toBe(s.options.length);
                break;
              case 'order':
                expect(s.lines.length, where).toBeGreaterThanOrEqual(2);
                expect(new Set(s.lines).size, `${where} : lignes uniques`).toBe(s.lines.length);
                break;
              case 'match':
                expect(new Set(s.pairs.map((p) => p[0])).size, where).toBe(s.pairs.length);
                expect(new Set(s.pairs.map((p) => p[1])).size, where).toBe(s.pairs.length);
                break;
              default:
                break;
            }
          }
        }
      }
    });
  }
});
