import { BarChart3, BookOpenCheck, Compass, FolderGit2, Home, LifeBuoy, ServerCog, ShieldCheck, Trophy, UserRound, type LucideIcon } from 'lucide-react'

export interface NavEntry {
  to: string
  key: string
  icon: LucideIcon
  tour?: string
  shortcut?: string[]
  /** Correspondance exacte de l'URL pour l'état actif */
  end?: boolean
  /** Couleur de section (pastille d'icône) */
  tone?: 'violet' | 'rose' | 'blue' | 'green' | 'amber' | 'slate'
}

export const COMMUNITY_NAV: NavEntry[] = [
  { to: '/', key: 'nav.home', icon: Home, end: true, tour: 'home', shortcut: ['G', 'H'], tone: 'violet' },
  { to: '/sos', key: 'nav.sos', icon: LifeBuoy, shortcut: ['G', 'S'], tone: 'rose' },
  { to: '/projets', key: 'nav.projects', icon: FolderGit2, tour: 'projects', shortcut: ['G', 'P'], tone: 'blue' },
  { to: '/decouvrir', key: 'nav.discover', icon: Compass, shortcut: ['G', 'D'], tone: 'green' },
  { to: '/classement', key: 'nav.leaderboard', icon: Trophy, tone: 'amber' },
]

export const PLATFORM_NAV: NavEntry[] = [
  { to: '/systalink', key: 'nav.systalink', icon: ServerCog },
  { to: '/impact', key: 'nav.impact', icon: BarChart3 },
  { to: '/regles', key: 'nav.rules', icon: BookOpenCheck },
]

export const ADMIN_NAV: NavEntry = { to: '/admin', key: 'nav.admin', icon: ShieldCheck }
export const PASSPORT_ICON = UserRound
