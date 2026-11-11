import type { AppLang } from '@/i18n';

// Un titre de document par route (WCAG 2.4.2, RGAA 8.6 ; recette du 10/11/2026, A11Y-03) : le lecteur
// d'écran annonce la page et l'onglet dit où l'on est. Les routes absentes de la table (adresse
// inconnue) gardent le titre posé par l'écran « introuvable ».

export const SITE_NAME = 'DevHub Africa';
const HOME_TITLE = {
  fr: 'DevHub Africa — la plateforme d’échange des devs africains',
  en: 'DevHub Africa — the exchange platform for African developers',
};

type Label = { fr: string; en: string };
const L = (fr: string, en = fr): Label => ({ fr, en });

/** Premier segment de l'adresse → libellé. `null` : page d'accueil. */
const SECTIONS: Record<string, Label> = {
  connexion: L('Connexion', 'Sign in'),
  inscription: L('Créer un compte', 'Sign up'),
  'mot-de-passe': L('Mot de passe oublié', 'Forgot password'),
  bienvenue: L('Bienvenue', 'Welcome'),
  post: L('Publication', 'Post'),
  publier: L('Publier', 'Publish'),
  emplois: L('Emplois', 'Jobs'),
  entreprises: L('Entreprise', 'Company'),
  messages: L('Messages'),
  certifications: L('Certifications'),
  certificat: L('Vérifier un certificat', 'Verify a certificate'),
  skills: L('Skills IA', 'AI skills'),
  sources: L('Sources'),
  lecon: L('Leçon', 'Lesson'),
  prevol: L('Pré-vol', 'Preflight'),
  label: L('Label DevHub Ready', 'DevHub Ready label'),
  banc: L('Banc d’essai', 'Test bench'),
  sos: L('Question', 'Question'),
  projets: L('Projets', 'Projects'),
  p: L('Salle de projet', 'Project room'),
  decouvrir: L('Découvrir', 'Discover'),
  carte: L('Carte des devs', 'Developer map'),
  u: L('Profil', 'Profile'),
  systalink: L('Systalink'),
  impact: L('Impact'),
  regles: L('Règles et XP', 'Rules and XP'),
  confidentialite: L('Confidentialité', 'Privacy'),
  reglages: L('Réglages', 'Settings'),
};

/** Sous-pages qui ont leur propre libellé. */
const SUB: Record<string, Label> = {
  'projets/nouvelle': L('Nouvelle salle', 'New room'),
  'systalink/aide': L('Aide Systalink', 'Systalink help'),
  'emplois/direct': L('Offre d’emploi', 'Job offer'),
};

export const withSite = (label: string) => `${label} · ${SITE_NAME}`;

/** Titre du document pour une adresse ; `null` si la route est inconnue (l'écran 404 décide). */
export function pageTitle(pathname: string, lang: AppLang): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return HOME_TITLE[lang === 'en' ? 'en' : 'fr'];
  const pick = (l: Label) => (lang === 'en' ? l.en : l.fr);
  const sub = SUB[`${parts[0]}/${parts[1] ?? ''}`];
  if (sub) return withSite(pick(sub));
  const section = SECTIONS[parts[0]!];
  if (!section) return null;
  // Profil public : le pseudo dit de qui il s'agit.
  if (parts[0] === 'u' && parts[1]) return withSite(`${pick(section)} @${parts[1]}`);
  // Label : le domaine dit de quelle application il s'agit.
  if (parts[0] === 'label' && parts[1]) return withSite(`${pick(section)} · ${parts[1]}`);
  // Sous-page d'une liste (offre, examen…) : on précise qu'il s'agit du détail.
  if (
    parts.length > 1 &&
    ['emplois', 'certifications', 'skills', 'banc', 'prevol'].includes(parts[0]!)
  )
    return withSite(`${pick(section)} · ${lang === 'en' ? 'details' : 'détail'}`);
  return withSite(pick(section));
}
