import { BarChart3, BookOpenCheck, Compass, FolderGit2, Home, LifeBuoy, ServerCog, ShieldCheck, Trophy, UserRound, type LucideIcon } from 'lucide-react'

export interface NavEntry {
  to: string
  key: string
  icon: LucideIcon
  tour?: string
  shortcut?: string[]
  /** Correspondance exacte de l'URL pour l'état actif */
  end?: boolean
}

export const COMMUNITY_NAV: NavEntry[] = [
  { to: '/', key: 'nav.home', icon: Home, end: true, tour: 'home', shortcut: ['G', 'H'] },
  { to: '/sos', key: 'nav.sos', icon: LifeBuoy, shortcut: ['G', 'S'] },
  { to: '/projets', key: 'nav.projects', icon: FolderGit2, tour: 'projects', shortcut: ['G', 'P'] },
  { to: '/decouvrir', key: 'nav.discover', icon: Compass, shortcut: ['G', 'D'] },
  { to: '/classement', key: 'nav.leaderboard', icon: Trophy },
]

export const PLATFORM_NAV: NavEntry[] = [
  { to: '/systalink', key: 'nav.systalink', icon: ServerCog },
  { to: '/impact', key: 'nav.impact', icon: BarChart3 },
  { to: '/regles', key: 'nav.rules', icon: BookOpenCheck },
]

export const ADMIN_NAV: NavEntry = { to: '/admin', key: 'nav.admin', icon: ShieldCheck }
export const PASSPORT_ICON = UserRound
