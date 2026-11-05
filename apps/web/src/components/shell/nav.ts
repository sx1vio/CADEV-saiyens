import {
  Award,
  Briefcase,
  Compass,
  FolderGit2,
  Home,
  Map as MapIcon,
  PlaneTakeoff,
  Puzzle,
  ServerCog,
  Smartphone,
  BarChart3,
  BookOpenCheck,
  type LucideIcon,
} from 'lucide-react';

export interface NavEntry {
  to: string;
  /** Clé i18n (navEntry.*) */
  label: string;
  icon: LucideIcon;
  tour?: string;
  end?: boolean;
  /** Clé i18n du libellé court (barre d'onglets) */
  short?: string;
}

/**
 * Navigation resserrée le 05/11/2026 : le réseau (accueil, emplois, devs, projets), ce qui fait
 * progresser (certifications, outils IA) et ce qui fait livrer (pré-vol, banc d'essai).
 * L'entraide vit dans l'accueil ; les communautés sont devenues des centres d'intérêt.
 */
export const MAIN_NAV: NavEntry[] = [
  { to: '/', label: 'navEntry.home', short: 'navEntry.home', icon: Home, end: true, tour: 'home' },
  { to: '/emplois', label: 'navEntry.jobs', short: 'navEntry.jobs', icon: Briefcase },
  { to: '/decouvrir', label: 'navEntry.devs', short: 'navEntry.devsShort', icon: Compass },
  {
    to: '/projets',
    label: 'navEntry.projects',
    short: 'navEntry.projects',
    icon: FolderGit2,
    tour: 'projects',
  },
];

/** Progresser : se préparer et prouver. */
export const EXPLORE_NAV: NavEntry[] = [
  { to: '/certifications', label: 'navEntry.certs', short: 'navEntry.certsShort', icon: Award },
  { to: '/skills', label: 'navEntry.skills', short: 'navEntry.skills', icon: Puzzle },
];

/** Livrer : mettre en ligne une app qui tient. */
export const CREATE_NAV: NavEntry[] = [
  { to: '/prevol', label: 'navEntry.preflight', short: 'navEntry.preflight', icon: PlaneTakeoff },
  { to: '/banc', label: 'navEntry.testbench', short: 'navEntry.testbench', icon: Smartphone },
];

/** Hors barre latérale, accessibles par la recherche (Ctrl K). */
export const NETWORK_NAV: NavEntry[] = [
  { to: '/decouvrir', label: 'navEntry.findDevs', icon: Compass },
  { to: '/carte', label: 'navEntry.map', icon: MapIcon },
];

/** Les services, dans l'ordre (palette, barre d'onglets). */
export const SERVICES_NAV: NavEntry[] = [MAIN_NAV[1]!, ...EXPLORE_NAV, ...CREATE_NAV];

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
