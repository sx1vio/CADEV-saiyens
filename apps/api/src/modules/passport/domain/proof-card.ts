import type { PassportResponse } from '@devhub/contracts';

// PR5 : Proof Card, image de partage 1200 × 630 générée depuis le Passport public. Elle ne lit
// que la réponse de PassportReader, déjà filtrée par la confidentialité (PR14) : un champ masqué
// n'existe pas ici, il ne peut donc pas apparaître sur l'image.

export const CARD = { width: 1200, height: 630 } as const;
export type CardLang = 'fr' | 'en';

const TEXT = {
  fr: {
    kicker: 'Developer Passport',
    demo: 'Compte démo',
    xp: 'Proof XP',
    unblocked: 'devs débloqués',
    verified: 'contributions vérifiées',
    noSkills: 'Compétences en cours de preuve',
    skillsTitle: 'COMPÉTENCES PROUVÉES PAR LE CODE',
    tagline: 'Par les devs, pour les devs',
    level: { beginner: 'Débutant', confirmed: 'Confirmé', advanced: 'Avancé', expert: 'Expert' },
  },
  en: {
    kicker: 'Developer Passport',
    demo: 'Demo account',
    xp: 'Proof XP',
    unblocked: 'devs unblocked',
    verified: 'verified contributions',
    noSkills: 'Skills being proven',
    skillsTitle: 'SKILLS PROVEN BY CODE',
    tagline: 'By devs, for devs',
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
 * SVG de la carte. `siteHost` : domaine affiché en pied de carte (ex. devafrica.tech).
 * Aucun appel réseau (pas d'avatar distant) : la carte se génère même hors connexion du serveur.
 * Charte DevHub (refonte du 10/11/2026) : tons sombres façon Discord, dégradé bleu → turquoise du
 * logo, compétences dans un panneau, chiffres en tuiles.
 */
export function renderProofCard(p: PassportResponse, lang: CardLang, siteHost: string): string {
  const t = TEXT[lang];
  const u = p.user;
  const W = CARD.width;
  const parts: string[] = [];

  // En-tête : logo (pastille dégradée + mot « DevHub ») et type de document
  parts.push(
    // Symbole DevHub (components/brand.tsx) : chevrons liés par un S, dégradé bleu → turquoise
    `<g transform="translate(64 56) scale(0.5)" fill="none" stroke="url(#mark)" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M35 21 12 40l17 14" stroke-width="9"/><path d="M65 26l23 14-21 16" stroke-width="9"/><path d="M19 65c10 7 21 4 25-8l10-34c4-11 15-14 25-7" stroke-width="8"/>`,
    `</g>`,
    `<text x="122" y="88" font-size="32" font-weight="700" fill="#f2f3f5">Dev<tspan fill="#5eead4">Hub</tspan></text>`,
    `<rect x="${W - 64 - 300}" y="56" width="300" height="40" rx="20" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.14"/>`,
    `<text x="${W - 64 - 150}" y="83" text-anchor="middle" font-size="19" font-weight="700" fill="#c9cdd3" letter-spacing="0.5">${text(t.kicker, 30)}</text>`,
  );

  // Identité : avatar à anneau dégradé, nom, pseudo et pays
  parts.push(
    `<circle cx="132" cy="196" r="62" fill="none" stroke="url(#brand)" stroke-width="5"/>`,
    `<circle cx="132" cy="196" r="54" fill="#2b2d31"/>`,
    `<text x="132" y="215" text-anchor="middle" font-size="48" font-weight="700" fill="#f2f3f5">${text(initials(u.displayName), 2)}</text>`,
    `<text x="226" y="192" font-size="50" font-weight="700" fill="#ffffff">${text(u.displayName, 26)}</text>`,
    `<text x="228" y="236" font-size="26" fill="#b5bac1">@${text(u.handle, 30)}${u.country ? ` · ${text(u.country, 3)}` : ''}</text>`,
  );
  if (u.isDemo) {
    parts.push(
      `<rect x="${W - 64 - 220}" y="172" width="220" height="44" rx="22" fill="#78350f"/>`,
      `<text x="${W - 64 - 110}" y="202" text-anchor="middle" font-size="22" font-weight="700" fill="#fde68a">${text(t.demo, 16)}</text>`,
    );
  }

  // Compétences : 3 au plus, score et niveau calculés (jamais saisis)
  const skills = p.skills.slice(0, 3);
  parts.push(
    `<rect x="64" y="276" width="${W - 128}" height="200" rx="26" fill="#1e1f22" stroke="#ffffff" stroke-opacity="0.08"/>`,
    `<text x="96" y="316" font-size="18" font-weight="700" fill="#949ba4" letter-spacing="1.5">${text(t.skillsTitle, 40)}</text>`,
  );
  if (skills.length === 0) {
    parts.push(`<text x="96" y="392" font-size="28" fill="#b5bac1">${text(t.noSkills, 50)}</text>`);
  }
  skills.forEach((s, i) => {
    const y = 368 + i * 44;
    const track = 520;
    const width = Math.max(14, Math.round((Math.max(0, Math.min(100, s.score)) / 100) * track));
    parts.push(
      `<text x="96" y="${y}" font-size="26" font-weight="700" fill="#f2f3f5">${text(s.tag.label, 18)}</text>`,
      `<rect x="400" y="${y - 17}" width="${track}" height="16" rx="8" fill="#2b2d31"/>`,
      `<rect x="400" y="${y - 17}" width="${width}" height="16" rx="8" fill="url(#bar)"/>`,
      `<text x="${W - 96}" y="${y}" text-anchor="end" font-size="23" fill="#dbdee1">${s.score} · ${text(t.level[s.level], 12)}</text>`,
    );
  });

  // Chiffres en tuiles : seulement si la personne ne les a pas masqués (stats = null sinon)
  if (p.stats) {
    const facts: [string, string][] = [
      [number(p.stats.totalXp, lang), t.xp],
      [number(p.stats.answersAccepted, lang), t.unblocked],
      [number(p.stats.contributionsVerified, lang), t.verified],
    ];
    const tileW = (W - 128 - 2 * 20) / 3;
    facts.forEach(([n, label], i) => {
      const x = 64 + i * (tileW + 20);
      parts.push(
        `<rect x="${x}" y="496" width="${tileW}" height="78" rx="20" fill="#1e1f22" stroke="#ffffff" stroke-opacity="0.08"/>`,
        `<text x="${x + 26}" y="545" font-size="32" font-weight="700" fill="#ffffff">${text(n, 10)}</text>`,
        `<text x="${x + 26 + Math.max(1, n.length) * 20 + 12}" y="543" font-size="19" fill="#b5bac1">${text(label, 24)}</text>`,
      );
    });
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.width}" height="${CARD.height}" viewBox="0 0 ${CARD.width} ${CARD.height}" font-family="${FONT}">`,
    `<defs>`,
    `<linearGradient id="mark" x1="0" y1="0.75" x2="1" y2="0.25"><stop offset="0" stop-color="#0a6cff"/><stop offset="0.5" stop-color="#10b0f0"/><stop offset="1" stop-color="#20e2b4"/></linearGradient>`,
    `<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#2dd4bf"/></linearGradient>`,
    `<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#2dd4bf"/></linearGradient>`,
    `<radialGradient id="glowA" cx="0.88" cy="0.05" r="0.55"><stop offset="0" stop-color="#2563eb" stop-opacity="0.45"/><stop offset="1" stop-color="#2563eb" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="glowB" cx="0.05" cy="1" r="0.5"><stop offset="0" stop-color="#14b8a6" stop-opacity="0.22"/><stop offset="1" stop-color="#14b8a6" stop-opacity="0"/></radialGradient>`,
    `</defs>`,
    `<rect width="${W}" height="${CARD.height}" fill="#111214"/>`,
    `<rect width="${W}" height="${CARD.height}" fill="url(#glowA)"/>`,
    `<rect width="${W}" height="${CARD.height}" fill="url(#glowB)"/>`,
    ...parts,
    `<text x="64" y="608" font-size="20" fill="#949ba4">${text(`${siteHost}/u/${u.handle}`, 60)}</text>`,
    `<text x="${W - 64}" y="608" text-anchor="end" font-size="20" fill="#949ba4">${text(t.tagline, 50)}</text>`,
    `</svg>`,
  ].join('\n');
}
