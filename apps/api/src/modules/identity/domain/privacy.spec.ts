import { describe, expect, it } from 'vitest';
import { resolvePrivacy } from './privacy';

describe('resolvePrivacy (PR14)', () => {
  it('rien de masqué par défaut, même pour une valeur illisible', () => {
    const none = {
      unlisted: false,
      hideCountry: false,
      hideTimezone: false,
      hideAvailability: false,
      hideStats: false,
    };
    expect(resolvePrivacy({})).toEqual(none);
    expect(resolvePrivacy(null)).toEqual(none);
    expect(resolvePrivacy('x')).toEqual(none);
  });

  it('les clés de PATCH /me masquent', () => {
    expect(
      resolvePrivacy({
        hideCountry: true,
        hideAvailability: true,
        hideStats: true,
        unlisted: true,
      }),
    ).toEqual({
      unlisted: true,
      hideCountry: true,
      hideTimezone: true,
      hideAvailability: true,
      hideStats: true,
    });
  });

  it('les clés du modèle de données (« champ visible ») masquent aussi', () => {
    expect(resolvePrivacy({ country: false, availability: false, stats: false })).toMatchObject({
      hideCountry: true,
      hideTimezone: true,
      hideAvailability: true,
      hideStats: true,
    });
    expect(resolvePrivacy({ timezone: false })).toMatchObject({
      hideCountry: false,
      hideTimezone: true,
    });
  });
});
