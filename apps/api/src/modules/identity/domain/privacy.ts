// PR14 (réduit par l'ADR-0017) : réglages de confidentialité, appliqués **côté API** (10-securite.md).
// Le JSON `users.privacy` accepte deux écritures : les clés du modèle (05, « champ visible »,
// ex. `country: false`) et celles de PATCH /me (`hideCountry: true`). Les deux masquent.

export interface ResolvedPrivacy {
  /** Absent des listes de découverte et du classement ; le Passport reste accessible par son URL. */
  unlisted: boolean;
  hideCountry: boolean;
  /** Le fuseau révèle le pays (« Africa/Dakar ») : masqué aussi quand le pays l'est. */
  hideTimezone: boolean;
  hideAvailability: boolean;
  hideStats: boolean;
}

export function resolvePrivacy(raw: unknown): ResolvedPrivacy {
  const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const hidden = (hideKey: string, visibleKey: string) =>
    p[hideKey] === true || p[visibleKey] === false;
  const hideCountry = hidden('hideCountry', 'country');
  return {
    unlisted: p.unlisted === true,
    hideCountry,
    hideTimezone: hideCountry || hidden('hideTimezone', 'timezone'),
    hideAvailability: hidden('hideAvailability', 'availability'),
    hideStats: hidden('hideStats', 'stats'),
  };
}
