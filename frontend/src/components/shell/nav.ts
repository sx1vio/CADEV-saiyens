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
} from 'lucide-react'

export interface NavEntry {
  to: string
  label: string
  icon: LucideIcon
  /** Couleur du service (pastille, en-tête) */
  color?: string
  tour?: string
  end?: boolean
  /** Libellé court pour le mini-guide et la barre d'onglets */
  short?: string
}

/** Le cœur : fil, entraide, communautés. */
export const MAIN_NAV: NavEntry[] = [
  { to: '/', label: 'Accueil', short: 'Accueil', icon: Home, end: true, tour: 'home', color: '#ff6b3d' },
  { to: '/sos', label: 'Entraide', short: 'Entraide', icon: LifeBuoy, color: '#f2575a' },
  { to: '/communautes', label: 'Communautés', short: 'Communautés', icon: Users, color: '#fb923c' },
]

/** Les services de l'écosystème. */
export const SERVICES_NAV: NavEntry[] = [
  { to: '/emplois', label: 'Emplois', short: 'Emplois', icon: Briefcase, color: '#22a3ee' },
  { to: '/certifications', label: 'Certifications', short: 'Certifs', icon: Award, color: '#f0b232' },
  { to: '/skills', label: 'Skills & plugins IA', short: 'Skills', icon: Puzzle, color: '#8b7cf8' },
  { to: '/videos', label: 'Vidéos', short: 'Vidéos', icon: PlaySquare, color: '#e5333b' },
  { to: '/apprendre', label: 'Apprendre', short: 'Apprendre', icon: GraduationCap, color: '#3ccf8e' },
  { to: '/creer', label: 'Créer une app avec l’IA', short: 'Créer', icon: Wand2, color: '#6a5ae6' },
  { to: '/templates', label: 'Templates', short: 'Templates', icon: LayoutTemplate, color: '#e879f9' },
  { to: '/projets', label: 'Projets', short: 'Projets', icon: FolderGit2, tour: 'projects', color: '#4f7cff' },
]

export const NETWORK_NAV: NavEntry[] = [
  { to: '/decouvrir', label: 'Trouver des devs', icon: Compass },
  { to: '/classement', label: 'Classement', icon: Trophy },
]

export const PLATFORM_NAV: NavEntry[] = [
  { to: '/systalink', label: 'Systalink', icon: ServerCog },
  { to: '/impact', label: 'Impact', icon: BarChart3 },
  { to: '/regles', label: 'Règles', icon: BookOpenCheck },
]

export const ADMIN_NAV: NavEntry = { to: '/admin', label: 'Modération', icon: ShieldCheck }

export const ALL_NAV = [...MAIN_NAV, ...SERVICES_NAV, ...NETWORK_NAV, ...PLATFORM_NAV, ADMIN_NAV]
