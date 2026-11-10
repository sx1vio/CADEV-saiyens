import { describe, expect, it } from 'vitest';
import { pageTitle } from './page-title';

describe('pageTitle (A11Y-03)', () => {
  it('donne un titre propre à chaque page connue', () => {
    expect(pageTitle('/', 'fr')).toContain('DevHub Africa');
    expect(pageTitle('/emplois', 'fr')).toBe('Emplois · DevHub Africa');
    expect(pageTitle('/connexion', 'en')).toBe('Sign in · DevHub Africa');
    expect(pageTitle('/u/chim31', 'fr')).toBe('Profil @chim31 · DevHub Africa');
    expect(pageTitle('/projets/nouvelle', 'fr')).toBe('Nouvelle salle · DevHub Africa');
    expect(pageTitle('/emplois/42', 'fr')).toBe('Emplois · détail · DevHub Africa');
  });

  it('laisse l’écran introuvable décider pour une adresse inconnue', () => {
    expect(pageTitle('/qa-inexistante', 'fr')).toBeNull();
    expect(pageTitle('/.env', 'fr')).toBeNull();
  });

  it('les titres diffèrent d’une page à l’autre', () => {
    const titles = ['/emplois', '/certifications', '/regles', '/connexion'].map((p) =>
      pageTitle(p, 'fr'),
    );
    expect(new Set(titles).size).toBe(titles.length);
  });
});
