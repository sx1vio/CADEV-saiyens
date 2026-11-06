import { describe, expect, it } from 'vitest';
import { CERT_CATALOG, CERT_RETRY_DELAY_MS, certMeta } from '.';

// Le catalogue public est vérifié contre la banque de l'API (modules/certifications) ;
// ici, sa cohérence interne et l'absence de réponses.
describe('catalogue public des certifications', () => {
  it('a des identifiants uniques et un programme cohérent', () => {
    const ids = CERT_CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CERT_CATALOG) {
      expect(c.topicCounts).toHaveLength(c.syllabus.length);
      expect(c.topicCounts.reduce((s, n) => s + n, 0)).toBe(c.bankSize);
      expect(c.bankSize).toBeGreaterThanOrEqual(c.draw);
    }
    expect(JSON.stringify(CERT_CATALOG)).not.toMatch(/"(answer|explain|quiz)"/);
  });

  it('retrouve une fiche par identifiant', () => {
    expect(certMeta('git-fondamentaux')?.title).toContain('Git');
    expect(certMeta('inconnue')).toBeUndefined();
  });

  it('impose une heure entre deux tentatives après un échec', () => {
    expect(CERT_RETRY_DELAY_MS).toBe(60 * 60 * 1000);
  });
});
