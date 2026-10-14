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
  ShieldCheck,
  Trophy,
  Users,
  Wand2,
  type LucideIcon,
} from 'lucide-react';

export interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Couleur du service (pastille, en-tête) */
  color?: string;
  tour?: string;
  end?: boolean;
  /** Libellé court pour le mini-guide et la barre d'onglets */
  short?: string;
}

/** L'essentiel : le fil, l'entraide, les communautés, les emplois. */
export const MAIN_NAV: NavEntry[] = [
  { to: '/', label: 'Accueil', short: 'Accueil', icon: Home, end: true, tour: 'home' },
  { to: '/sos', label: 'Entraide', short: 'Entraide', icon: LifeBuoy },
  { to: '/communautes', label: 'Communautés', short: 'Communautés', icon: Users },
  { to: '/emplois', label: 'Emplois', short: 'Emplois', icon: Briefcase },
];

/** Explorer : ce qu'on consulte. */
export const EXPLORE_NAV: NavEntry[] = [
  { to: '/projets', label: 'Projets', short: 'Projets', icon: FolderGit2, tour: 'projects' },
  { to: '/videos', label: 'Vidéos', short: 'Vidéos', icon: PlaySquare },
  { to: '/apprendre', label: 'Apprendre', short: 'Apprendre', icon: GraduationCap },
  { to: '/certifications', label: 'Certifications', short: 'Certifs', icon: Award },
  { to: '/skills', label: 'Outils IA', short: 'Outils IA', icon: Puzzle },
  { to: '/decouvrir', label: 'Développeurs', short: 'Devs', icon: Compass },
];

/** Créer : ce qu'on fabrique. */
export const CREATE_NAV: NavEntry[] = [
  { to: '/creer', label: 'Guide « app avec l’IA »', short: 'Guide IA', icon: Wand2 },
  { to: '/templates', label: 'Templates', short: 'Templates', icon: LayoutTemplate },
];

/** Hors barre latérale, accessibles par la recherche (Ctrl K) et depuis « Développeurs ». */
export const NETWORK_NAV: NavEntry[] = [
  { to: '/decouvrir', label: 'Trouver des devs', icon: Compass },
  { to: '/classement', label: 'Classement', icon: Trophy },
];

/** Compatibilité : les services, dans l'ordre d'avant (palette, barre d'onglets). */
export const SERVICES_NAV: NavEntry[] = [MAIN_NAV[3]!, ...EXPLORE_NAV.slice(0, 5), ...CREATE_NAV];

export const PLATFORM_NAV: NavEntry[] = [
  { to: '/systalink', label: 'Systalink', icon: ServerCog },
  { to: '/impact', label: 'Impact', icon: BarChart3 },
  { to: '/regles', label: 'Règles', icon: BookOpenCheck },
];

export const ADMIN_NAV: NavEntry = { to: '/admin', label: 'Modération', icon: ShieldCheck };

export const ALL_NAV = [
  ...MAIN_NAV,
  ...EXPLORE_NAV,
  ...CREATE_NAV,
  NETWORK_NAV[1]!,
  ...PLATFORM_NAV,
  ADMIN_NAV,
];

/**
 * ADR-0020 : services de l'écosystème sans API (contenus de démonstration, état gardé sur
 * l'appareil). Le fil d'actualités et les vidéos ont une vraie API : ils n'y figurent pas.
 */
const ECOSYSTEM_PREVIEW = [
  '/communautes',
  '/c/',
  '/emplois',
  '/apprendre',
  '/certifications',
  '/skills',
  '/post/',
  '/publier',
  '/templates',
  '/creer',
];

export const isEcosystemPreview = (path: string) =>
  ECOSYSTEM_PREVIEW.some((p) =>
    p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(`${p}/`),
  );
