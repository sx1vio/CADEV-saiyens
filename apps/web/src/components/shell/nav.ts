import {
  Award,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  Compass,
  FolderGit2,
  GraduationCap,
  Home,
  LayoutTemplate,
  LifeBuoy,
  PlaySquare,
  Puzzle,
  ServerCog,
  Trophy,
  Users,
  Wand2,
  type LucideIcon,
} from 'lucide-react';

export interface NavEntry {
  to: string;
  /** Clé i18n (navEntry.*) */
  label: string;
  icon: LucideIcon;
  /** Couleur du service (pastille, en-tête) */
  color?: string;
  tour?: string;
  end?: boolean;
  /** Libellé court pour le mini-guide et la barre d'onglets */
  /** Clé i18n du libellé court */
  short?: string;
}

/** L'essentiel : le fil, l'entraide, les communautés, les emplois. */
export const MAIN_NAV: NavEntry[] = [
  { to: '/', label: 'navEntry.home', short: 'navEntry.home', icon: Home, end: true, tour: 'home' },
  { to: '/sos', label: 'navEntry.help', short: 'navEntry.help', icon: LifeBuoy },
  { to: '/communautes', label: 'navEntry.communities', short: 'navEntry.communities', icon: Users },
  { to: '/emplois', label: 'navEntry.jobs', short: 'navEntry.jobs', icon: Briefcase },
];

/** Explorer : ce qu'on consulte. */
export const EXPLORE_NAV: NavEntry[] = [
  {
    to: '/projets',
    label: 'navEntry.projects',
    short: 'navEntry.projects',
    icon: FolderGit2,
    tour: 'projects',
  },
  { to: '/videos', label: 'navEntry.videos', short: 'navEntry.videos', icon: PlaySquare },
  { to: '/apprendre', label: 'navEntry.learn', short: 'navEntry.learn', icon: GraduationCap },
  { to: '/certifications', label: 'navEntry.certs', short: 'navEntry.certsShort', icon: Award },
  { to: '/skills', label: 'navEntry.skills', short: 'navEntry.skills', icon: Puzzle },
  { to: '/decouvrir', label: 'navEntry.devs', short: 'navEntry.devsShort', icon: Compass },
];

/** Créer : ce qu'on fabrique. */
export const CREATE_NAV: NavEntry[] = [
  { to: '/creer', label: 'navEntry.guide', short: 'navEntry.guideShort', icon: Wand2 },
  {
    to: '/templates',
    label: 'navEntry.templates',
    short: 'navEntry.templates',
    icon: LayoutTemplate,
  },
];

/** Hors barre latérale, accessibles par la recherche (Ctrl K) et depuis « Développeurs ». */
export const NETWORK_NAV: NavEntry[] = [
  { to: '/decouvrir', label: 'navEntry.findDevs', icon: Compass },
  { to: '/classement', label: 'navEntry.leaderboard', icon: Trophy },
];

/** Compatibilité : les services, dans l'ordre d'avant (palette, barre d'onglets). */
export const SERVICES_NAV: NavEntry[] = [MAIN_NAV[3]!, ...EXPLORE_NAV.slice(0, 5), ...CREATE_NAV];

export const PLATFORM_NAV: NavEntry[] = [
  { to: '/systalink', label: 'navEntry.systalink', icon: ServerCog },
  { to: '/impact', label: 'navEntry.impact', icon: BarChart3 },
  { to: '/regles', label: 'navEntry.rules', icon: BookOpenCheck },
];

export const ALL_NAV = [
  ...MAIN_NAV,
  ...EXPLORE_NAV,
  ...CREATE_NAV,
  NETWORK_NAV[1]!,
  ...PLATFORM_NAV,
];

/**
 * ADR-0020 : services de l'écosystème sans API (contenus de démonstration, état gardé sur
 * l'appareil). Le fil d'actualités et les vidéos ont une vraie API : ils n'y figurent pas.
 * Les cours (/apprendre) et le guide (/creer) ont un contenu réel : seule la progression
 * reste sur l'appareil, ce qui ne justifie pas le bandeau.
 */
const ECOSYSTEM_PREVIEW = ['/communautes', '/c/', '/post/', '/publier', '/templates'];

export const isEcosystemPreview = (path: string) =>
  ECOSYSTEM_PREVIEW.some((p) =>
    p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(`${p}/`),
  );
