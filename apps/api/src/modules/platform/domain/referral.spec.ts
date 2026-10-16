import { describe, expect, it } from 'vitest';
import { systalinkUrl } from './referral';

describe('renvoi vers Systalink (idée B)', () => {
  it('destination de la liste fermée, avec les paramètres d’attribution', () => {
    const url = new URL(systalinkUrl('deploy', 'room', 'https://github.com/awa/paylink'));
    expect(url.origin + url.pathname).toBe('https://platform.systalink.com/serverless');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: 'devhub-africa',
      utm_medium: 'room',
      utm_campaign: 'cadev-2026',
      repo: 'https://github.com/awa/paylink',
    });
  });

  it('Orion pour les non-développeurs, sans dépôt', () => {
    const url = new URL(systalinkUrl('orion', 'build'));
    expect(url.hostname).toBe('systalink.com');
    expect(url.searchParams.has('repo')).toBe(false);
  });
});
