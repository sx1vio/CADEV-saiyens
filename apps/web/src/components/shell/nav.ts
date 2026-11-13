import type { ComponentType } from 'react';
import {
  AirplaneTakeoff,
  Briefcase,
  Certificate,
  ChartBar,
  Compass,
  DeviceMobile,
  Plugs,
  FolderSimple,
  House,
  HardDrives,
  Lifebuoy,
  MapTrifold,
  Newspaper,
  PuzzlePiece,
  Scroll,
  ShieldCheck,
} from '@phosphor-icons/react';

/** Icône pleine et unie (Phosphor, graisse « fill » fixée par le shell). */
export type NavIcon = ComponentType<{ className?: string; weight?: 'fill' | 'regular' | 'bold' }>;

export interface NavEntry {
  to: string;
  /** Clé i18n (navEntry.*) */
  label: string;
  icon: NavIcon;
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
  { to: '/', label: 'navEntry.home', short: 'navEntry.home', icon: House, end: true, tour: 'home' },
  { to: '/emplois', label: 'navEntry.jobs', short: 'navEntry.jobs', icon: Briefcase },
  { to: '/decouvrir', label: 'navEntry.devs', short: 'navEntry.devsShort', icon: Compass },
  {
    to: '/projets',
    label: 'navEntry.projects',
    short: 'navEntry.projects',
    icon: FolderSimple,
    tour: 'projects',
  },
];

/** Progresser : se préparer et prouver. */
export const EXPLORE_NAV: NavEntry[] = [
  {
    to: '/certifications',
    label: 'navEntry.certs',
    short: 'navEntry.certsShort',
    icon: Certificate,
  },
  { to: '/skills', label: 'navEntry.skills', short: 'navEntry.skills', icon: PuzzlePiece },
];

/** Livrer : mettre en ligne une app qui tient. */
export const CREATE_NAV: NavEntry[] = [
  {
    to: '/prevol',
    label: 'navEntry.preflight',
    short: 'navEntry.preflight',
    icon: AirplaneTakeoff,
  },
  { to: '/banc', label: 'navEntry.testbench', short: 'navEntry.testbench', icon: DeviceMobile },
  { to: '/mcp', label: 'navEntry.mcp', short: 'navEntry.mcpShort', icon: Plugs },
  { to: '/systalink', label: 'navEntry.host', short: 'navEntry.hostShort', icon: HardDrives },
];

/** Hors barre latérale, accessibles par la recherche (Ctrl K). */
export const NETWORK_NAV: NavEntry[] = [
  { to: '/decouvrir', label: 'navEntry.findDevs', icon: Compass },
  { to: '/carte', label: 'navEntry.map', icon: MapTrifold },
];

/** Les services, dans l'ordre (palette, barre d'onglets). */
export const SERVICES_NAV: NavEntry[] = [MAIN_NAV[1]!, ...EXPLORE_NAV, ...CREATE_NAV];

/** Pages d'information, accessibles par la recherche (Ctrl K) (#200). */
export const PLATFORM_NAV: NavEntry[] = [
  { to: '/systalink/aide', label: 'navEntry.systalinkHelp', icon: Lifebuoy },
  { to: '/impact', label: 'navEntry.impact', icon: ChartBar },
  { to: '/regles', label: 'navEntry.rules', icon: Scroll },
  { to: '/sources', label: 'navEntry.sources', icon: Newspaper },
  { to: '/confidentialite', label: 'navEntry.privacy', icon: ShieldCheck },
];

/**
 * Pages d'information, carte « Aide et infos » des Réglages : les mêmes que le groupe « DevHub »
 * du pied de page public, pour qu'aucune page ne disparaisse une fois connecté (#200).
 * Sorties de la barre latérale le 13/11/2026.
 */
export const INFO_LINKS: { to: string; label: string }[] = [
  { to: '/regles', label: 'navEntry.rules' },
  { to: '/impact', label: 'navEntry.impact' },
  { to: '/systalink', label: 'navEntry.systalink' },
  { to: '/sources', label: 'navEntry.sources' },
  { to: '/confidentialite', label: 'navEntry.privacy' },
];

export const ALL_NAV = [
  ...MAIN_NAV,
  ...EXPLORE_NAV,
  ...CREATE_NAV,
  NETWORK_NAV[1]!,
  ...PLATFORM_NAV,
];
