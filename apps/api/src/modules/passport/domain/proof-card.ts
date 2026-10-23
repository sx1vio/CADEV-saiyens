import type { PassportResponse } from '@devhub/contracts';

// PR5 : Proof Card, image de partage 1200 × 630 générée depuis le Passport public. Elle ne lit
// que la réponse de PassportReader, déjà filtrée par la confidentialité (PR14) : un champ masqué
// n'existe pas ici, il ne peut donc pas apparaître sur l'image.

export const CARD = { width: 1200, height: 630 } as const;
export type CardLang = 'fr' | 'en';

const TEXT = {
  fr: {
    kicker: 'Developer Passport · DevHub Africa',
    demo: 'Compte démo',
    xp: 'Proof XP',
    unblocked: 'devs débloqués',
    verified: 'contributions vérifiées',
    noSkills: 'Compétences en cours de preuve',
    level: { beginner: 'Débutant', confirmed: 'Confirmé', advanced: 'Avancé', expert: 'Expert' },
  },
  en: {
    kicker: 'Developer Passport · DevHub Africa',
    demo: 'Demo account',
    xp: 'Proof XP',
    unblocked: 'devs unblocked',
    verified: 'verified contributions',
    noSkills: 'Skills being proven',
    level: { beginner: 'Beginner', confirmed: 'Confirmed', advanced: 'Advanced', expert: 'Expert' },
  },
} as const;

const FONT = 'DejaVu Sans, Inter, Arial, sans-serif';

/** Texte inséré dans le SVG : échappé, une ligne, coupé à `max` caractères. */
function text(value: string, max: number): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  const cut = flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
  return cut.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

const number = (n: number, lang: CardLang) => n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');

/**
 * SVG de la carte. `siteHost` : domaine affiché en pied de carte (ex. devhub.africa).
 * Aucun appel réseau (pas d'avatar distant) : la carte se génère même hors connexion du serveur.
 */
export function renderProofCard(p: PassportResponse, lang: CardLang, siteHost: string): string {
  const t = TEXT[lang];
  const u = p.user;
  const parts: string[] = [];

  // Identité
  parts.push(
    `<circle cx="140" cy="200" r="64" fill="#1f2937"/>`,
    `<text x="140" y="222" text-anchor="middle" font-size="56" font-weight="700" fill="#f9fafb">${text(initials(u.displayName), 2)}</text>`,
    `<text x="240" y="190" font-size="54" font-weight="700" fill="#f9fafb">${text(u.displayName, 26)}</text>`,
    `<text x="240" y="240" font-size="30" fill="#9ca3af">@${text(u.handle, 30)}${u.country ? ` · ${text(u.country, 3)}` : ''}</text>`,
  );
  if (u.isDemo) {
    parts.push(
      `<rect x="900" y="60" width="240" height="48" rx="24" fill="#78350f"/>`,
      `<text x="1020" y="92" text-anchor="middle" font-size="24" font-weight="700" fill="#fde68a">${text(t.demo, 16)}</text>`,
    );
  }

  // Compétences : 3 au plus, score et niveau calculés (jamais saisis)
  const skills = p.skills.slice(0, 3);
  if (skills.length === 0) {
    parts.push(`<text x="80" y="340" font-size="30" fill="#9ca3af">${text(t.noSkills, 50)}</text>`);
  }
  skills.forEach((s, i) => {
    const y = 330 + i * 62;
    const width = Math.round((Math.max(0, Math.min(100, s.score)) / 100) * 420);
    parts.push(
      `<text x="80" y="${y}" font-size="30" font-weight="700" fill="#f9fafb">${text(s.tag.label, 20)}</text>`,
      `<rect x="420" y="${y - 22}" width="420" height="18" rx="9" fill="#1f2937"/>`,
      `<rect x="420" y="${y - 22}" width="${width}" height="18" rx="9" fill="#22c55e"/>`,
      `<text x="860" y="${y}" font-size="26" fill="#d1d5db">${s.score} · ${text(t.level[s.level], 12)}</text>`,
    );
  });

  // Chiffres : seulement si la personne ne les a pas masqués (stats = null sinon)
  if (p.stats) {
    const facts = [
      `${number(p.stats.totalXp, lang)} ${t.xp}`,
      `${number(p.stats.answersAccepted, lang)} ${t.unblocked}`,
      `${number(p.stats.contributionsVerified, lang)} ${t.verified}`,
    ];
    parts.push(
      `<text x="80" y="540" font-size="28" fill="#e5e7eb">${text(facts.join('  ·  '), 70)}</text>`,
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.width}" height="${CARD.height}" viewBox="0 0 ${CARD.width} ${CARD.height}" font-family="${FONT}">`,
    `<rect width="${CARD.width}" height="${CARD.height}" fill="#0b0f14"/>`,
    `<rect width="${CARD.width}" height="10" fill="#22c55e"/>`,
    `<text x="80" y="92" font-size="26" fill="#9ca3af">${text(t.kicker, 50)}</text>`,
    ...parts,
    `<text x="80" y="595" font-size="24" fill="#6b7280">${text(`${siteHost}/u/${u.handle}`, 70)}</text>`,
    `</svg>`,
  ].join('\n');
}
