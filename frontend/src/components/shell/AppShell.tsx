import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Bell,
  Briefcase,
  FolderPlus,
  Keyboard,
  Languages,
  LogOut,
  Map,
  Menu,
  Moon,
  PenSquare,
  Plus,
  Repeat,
  Search,
  Settings,
  Sun,
  UserRound,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { relativeTime, setLanguage, useLang } from '@/i18n'
import { useQuery, invalidate } from '@/lib/query'
import { cn } from '@/lib/utils'
import { api } from '@/services'
import { useSession, useUI } from '@/stores/app'
import { DropMenu, MenuItem, MenuLabel, MenuSeparator, Sheet, useMedia } from '../ui/overlay'
import { Avatar, CountDot, Kbd } from '../ui/primitives'
import { ADMIN_NAV, MAIN_NAV, NETWORK_NAV, SERVICES_NAV, type NavEntry } from './nav'
import { NetworkIndicator, OfflineBanner } from './network'
import * as Popover from '@radix-ui/react-popover'

/* ================================================================
   Charte « Drivery » : barre latérale noire flottante, entrées en pilules
   gris anthracite, entrée active lavande, badges rouges.
   ================================================================ */

function Logo({ dark = true }: { dark?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="DevHub Africa, accueil">
      <span className="grid size-8 place-items-center rounded-[10px] bg-accent-strong text-white">
        <svg viewBox="0 0 64 64" className="size-[22px]" aria-hidden>
          <path d="M24 20 14 32l10 12M40 20l10 12-10 12" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="5" fill="currentColor" />
        </svg>
      </span>
      <span className={cn('text-[19px] font-bold tracking-[-0.03em]', dark ? 'text-white' : 'text-fg')}>DevHub</span>
    </Link>
  )
}

function useCreateActions() {
  const nav = useNavigate()
  const setAsk = useUI((s) => s.setAsk)
  return [
    { icon: PenSquare, label: 'Publier un post', hint: 'Fil et communautés', run: () => nav('/publier') },
    { icon: Zap, label: 'Je suis bloqué', hint: 'Demander de l’aide', run: () => setAsk(true) },
    { icon: Briefcase, label: 'Publier une offre', hint: 'Espace entreprise', run: () => nav('/emplois/publier') },
    { icon: FolderPlus, label: 'Ouvrir un projet', hint: 'Trouver des contributeurs', run: () => nav('/projets/nouvelle') },
    { icon: Wand2, label: 'Créer une app avec l’IA', hint: 'Guide étape par étape', run: () => nav('/creer') },
  ]
}

function CreateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const actions = useCreateActions()
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Créer">
      <div className="flex flex-col gap-1.5">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => {
              onOpenChange(false)
              a.run()
            }}
            className="flex items-center gap-3 rounded-[16px] bg-surface-1 px-3 py-3 text-left hover:bg-surface-2"
          >
            <span className="grid size-10 place-items-center rounded-full bg-canvas text-fg">
              <a.icon className="size-5" />
            </span>
            <span>
              <span className="block text-[14px] font-semibold text-fg">{a.label}</span>
              <span className="block text-[12.5px] text-muted">{a.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function useIsActive() {
  const { pathname } = useLocation()
  return (e: NavEntry) => (e.end ? pathname === e.to : pathname === e.to || pathname.startsWith(`${e.to}/`))
}

/** Entrée de menu : pilule anthracite, lavande quand active, badge rouge. */
function SideItem({ entry, active, count, onNavigate }: { entry: NavEntry; active: boolean; count?: number; onNavigate?: () => void }) {
  const Icon = entry.icon
  return (
    <Link
      to={entry.to}
      onClick={onNavigate}
      data-tour={entry.tour}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center gap-3 rounded-[12px] pr-1.5 pl-3 text-[13px] font-medium transition-colors duration-150',
        active ? 'bg-accent-strong text-white' : 'bg-[#1c1c1e] text-white/90 hover:bg-[#262628]',
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      <span className="flex-1 truncate">{entry.short && entry.label.length > 22 ? entry.short : entry.label}</span>
      {!!count && <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-badge px-1.5 text-[11px] font-semibold text-white tabular">{count > 99 ? '99+' : count}</span>}
    </Link>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const me = useSession((s) => s.user)
  const setUser = useSession((s) => s.setUser)
  const setPalette = useUI((s) => s.setPalette)
  const isActive = useIsActive()
  const { pathname } = useLocation()
  const actions = useCreateActions()
  const { data: home } = useQuery(me ? 'home' : null, () => api.getHome())
  const help = home?.openInMyStacks.length ?? 0
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  const groups: NavEntry[][] = [
    MAIN_NAV,
    SERVICES_NAV,
    [...(me ? [{ to: `/u/${me.handle}`, label: 'Mon profil', icon: UserRound, tour: 'passport' } as NavEntry] : []), ...NETWORK_NAV, ...(me?.isAdmin ? [ADMIN_NAV] : [])],
  ]
  const row = 'flex h-9 w-full items-center gap-3 rounded-[12px] px-3 text-[13.5px] font-medium text-white/75 transition-colors hover:bg-[#1c1c1e] hover:text-white'
  return (
    <div data-tour="nav" className="flex h-full flex-col rounded-[28px] bg-black p-3 text-white">
      <div className="flex items-center justify-between px-2 pt-2 pb-4">
        <Logo />
        {onNavigate && (
          <button type="button" onClick={onNavigate} aria-label="Fermer le menu" className="grid size-9 place-items-center rounded-full text-white/70 hover:bg-[#1c1c1e]">
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="flex gap-2 pb-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            setPalette(true)
          }}
          data-tour="palette"
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-[#1c1c1e] px-3 text-left text-[13px] text-white/55 transition-colors hover:text-white/80"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate" title={isMac ? '⌘K' : 'Ctrl K'}>Rechercher</span>
        </button>
        {me && (
          <DropMenu
            align="start"
            trigger={
              <button type="button" aria-label="Créer" data-tour="ask" className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-white text-black transition-colors hover:bg-white/85">
                <Plus className="size-5" />
              </button>
            }
          >
            {actions.map((a) => (
              <MenuItem key={a.label} icon={<a.icon />} onSelect={a.run}>
                {a.label}
              </MenuItem>
            ))}
          </DropMenu>
        )}
      </div>

      <nav aria-label="Navigation principale" className="no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
        {groups.map((g, i) => (
          <div key={i} className="flex flex-col gap-1">
            {g.map((e) => (
              <SideItem key={e.to} entry={e} active={e.to.startsWith('/u/') ? pathname === e.to : isActive(e)} count={e.to === '/sos' ? help : undefined} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 pt-4">
        {me ? (
          <>
            <Notifications
              trigger={(unread) => (
                <button type="button" className={row}>
                  <Bell className="size-[18px]" />
                  <span className="flex-1 text-left">{t('nav.notifications')}</span>
                  {unread > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-badge px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
                </button>
              )}
            />
            <UserMenu
              trigger={
                <button type="button" className={row}>
                  <Settings className="size-[18px]" />
                  <span className="flex-1 text-left">Paramètres</span>
                  <Avatar name={me.displayName} src={me.avatarUrl} size={22} />
                </button>
              }
            />
            <button
              type="button"
              className={row}
              onClick={async () => {
                await api.logout()
                setUser(null)
                invalidate('')
                nav('/')
              }}
            >
              <LogOut className="size-[18px]" />
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <Link to="/connexion" className="flex h-10 items-center justify-center rounded-[14px] bg-accent-strong text-[13.5px] font-semibold text-white">
            {t('nav.login')}
          </Link>
        )}
      </div>
    </div>
  )
}

/** Barre du haut mobile et tablette (la barre latérale passe dans un tiroir). */
function MobileTop({ onMenu }: { onMenu: () => void }) {
  const setPalette = useUI((s) => s.setPalette)
  const me = useSession((s) => s.user)
  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3">
        <button type="button" onClick={onMenu} aria-label="Menu" className="grid size-10 place-items-center rounded-full hover:bg-surface-1">
          <Menu className="size-5" />
        </button>
        <Logo dark={false} />
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setPalette(true)} aria-label="Rechercher" className="grid size-10 place-items-center rounded-full hover:bg-surface-1">
            <Search className="size-5" />
          </button>
          <NetworkIndicator compact />
          {me && <Notifications />}
          {me && <UserMenu />}
        </div>
      </div>
      <OfflineBanner />
    </header>
  )
}

function Notifications({ trigger }: { trigger?: (unread: number) => ReactNode }) {
  const { t } = useTranslation()
  const lang = useLang()
  const nav = useNavigate()
  const me = useSession((s) => s.user)
  const { data } = useQuery(me ? `notifications:${me.id}` : null, () => api.listNotifications())
  const unread = data?.filter((n) => !n.readAt).length ?? 0
  const href = (p: Record<string, string | number>) => (p.questionId ? `/sos/${p.questionId}` : p.code ? `/p/${p.code}` : '/')
  return (
    <Popover.Root
      onOpenChange={(o) => {
        if (!o && unread) void api.markNotificationsRead().then(() => invalidate('notifications'))
      }}
    >
      <Popover.Trigger asChild>
        {trigger ? (
          trigger(unread)
        ) : (
          <button type="button" aria-label={t('nav.notifications')} className="relative grid size-10 place-items-center rounded-full text-fg transition-colors hover:bg-surface-1">
            <Bell className="size-5" />
            {unread > 0 && <CountDot count={unread} className="absolute top-1 right-1 ring-2 ring-canvas" />}
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" side="right" sideOffset={12} className="dh-pop z-[60] w-[min(380px,calc(100vw-24px))] rounded-[20px] bg-canvas shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-fg">{t('nav.notifications')}</p>
            {unread > 0 && <span className="text-xs text-subtle">{unread}</span>}
          </div>
          <div className="max-h-[60dvh] overflow-y-auto p-1.5">
            {!data?.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted">{t('nav.notifEmpty')}</p>
            ) : (
              data.map((n) => (
                <Popover.Close asChild key={n.id}>
                  <button
                    type="button"
                    onClick={() => nav(href(n.payload))}
                    className="flex w-full items-start gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-surface-1"
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-badge')} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug text-fg">{t(`notif.${n.type}`, n.payload)}</span>
                      <span className="mt-0.5 block text-xs text-subtle">{relativeTime(n.createdAt, lang)}</span>
                    </span>
                  </button>
                </Popover.Close>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function UserMenu({ trigger }: { trigger?: ReactNode }) {
  const { t } = useTranslation()
  const lang = useLang()
  const nav = useNavigate()
  const me = useSession((s) => s.user)
  const setUser = useSession((s) => s.setUser)
  const { theme, setTheme, startTour, setShortcuts } = useUI()
  if (!me) return null
  return (
    <DropMenu
      trigger={
        trigger ?? (
          <button type="button" className="rounded-full ring-offset-2 ring-offset-canvas transition-shadow hover:ring-2 hover:ring-accent" aria-label={me.displayName}>
            <Avatar name={me.displayName} src={me.avatarUrl} size={32} />
          </button>
        )
      }
    >
      <div className="flex items-center gap-3 px-2.5 py-2">
        <Avatar name={me.displayName} src={me.avatarUrl} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{me.displayName}</p>
          <p className="truncate text-xs text-subtle">@{me.handle}</p>
        </div>
      </div>
      <MenuSeparator />
      <MenuItem icon={<UserRound />} onSelect={() => nav(`/u/${me.handle}`)}>
        {t('nav.myPassport')}
      </MenuItem>
      <MenuItem icon={<Settings />} onSelect={() => nav('/reglages')}>
        {t('nav.settings')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={theme === 'dark' ? <Sun /> : <Moon />} onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
      </MenuItem>
      <MenuItem icon={<Languages />} onSelect={() => setLanguage(lang === 'fr' ? 'en' : 'fr')} hint={<span className="text-xs text-subtle">{lang === 'fr' ? 'EN' : 'FR'}</span>}>
        {t('nav.language')}
      </MenuItem>
      <MenuItem icon={<Map />} onSelect={() => { nav('/'); startTour() }}>
        {t('nav.tour')}
      </MenuItem>
      <MenuItem icon={<Keyboard />} onSelect={() => setShortcuts(true)} hint={<Kbd>?</Kbd>}>
        {t('nav.shortcuts')}
      </MenuItem>
      {me.isDemo && (
        <>
          <MenuSeparator />
          <MenuLabel>{t('auth.switchDemo')}</MenuLabel>
          <DemoSwitcher />
        </>
      )}
      <MenuSeparator />
      <MenuItem
        icon={<LogOut />}
        danger
        onSelect={async () => {
          await api.logout()
          setUser(null)
          invalidate('')
          nav('/')
        }}
      >
        {t('nav.logout')}
      </MenuItem>
    </DropMenu>
  )
}

function DemoSwitcher() {
  const me = useSession((s) => s.user)
  const setUser = useSession((s) => s.setUser)
  const nav = useNavigate()
  const { data } = useQuery('demo-accounts', () => api.listDemoAccounts())
  const picks = ['awa-kone', 'moussa-diop', 'kwame-dev', 'ousmane-sow', 'devhub-admin']
  return (
    <>
      {data
        ?.filter((u) => picks.includes(u.handle) && u.id !== me?.id)
        .map((u) => (
          <MenuItem
            key={u.id}
            icon={<Repeat />}
            onSelect={async () => {
              const user = await api.loginDemo(u.handle)
              setUser(user)
              invalidate('')
              nav('/')
            }}
          >
            {u.displayName}
          </MenuItem>
        ))}
    </>
  )
}

/* ================================================================
   Barre d'onglets mobile (< 640 px)
   ================================================================ */

function TabBar({ onCreate }: { onCreate: () => void }) {
  const tabs = [MAIN_NAV[0], SERVICES_NAV[0], null, SERVICES_NAV[4], SERVICES_NAV[3]]
  return (
    <nav aria-label="Navigation" className="fixed inset-x-3 bottom-3 z-40 rounded-[24px] bg-black pb-safe text-white shadow-lg sm:hidden">
      <div className="grid h-16 grid-cols-5 items-center">
        {tabs.map((tab) =>
          tab ? (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => cn('flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium', isActive ? 'text-white' : 'text-white/55')}>
              {({ isActive }) => (
                <>
                  <span className={cn('grid h-7 w-11 place-items-center rounded-full', isActive && 'bg-accent-strong')}>
                    <tab.icon className="size-[19px]" />
                  </span>
                  {tab.short}
                </>
              )}
            </NavLink>
          ) : (
            <div key="create" className="flex justify-center">
              <button type="button" onClick={onCreate} aria-label="Créer" data-tour="ask-mobile" className="grid size-11 place-items-center rounded-full bg-white text-black active:scale-95">
                <Plus className="size-6" />
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  )
}

/* ================================================================
   Tiroir (mobile et tablette) avec geste de balayage
   ================================================================ */

function Drawer() {
  const open = useUI((s) => s.drawerOpen)
  const setOpen = useUI((s) => s.setDrawer)
  const startX = useRef<number | null>(null)
  const [dx, setDx] = useState(0)
  const close = () => setOpen(false)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dh-overlay fixed inset-0 z-50 bg-[var(--scrim)]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="dh-drawer fixed inset-y-0 left-0 z-50 w-[272px] max-w-[88vw] p-2 focus:outline-none"
          style={{ transform: dx < 0 ? `translateX(${dx}px)` : undefined, transition: startX.current === null ? 'transform 220ms var(--ease-out)' : 'none' }}
          onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
          onTouchMove={(e) => startX.current !== null && setDx(Math.min(0, e.touches[0].clientX - startX.current))}
          onTouchEnd={() => {
            if (dx < -80) close()
            startX.current = null
            setDx(0)
          }}
        >
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
          <Sidebar onNavigate={close} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Ouverture du tiroir par balayage depuis le bord gauche (mobile). */
function useEdgeSwipe(enabled: boolean) {
  const setOpen = useUI((s) => s.setDrawer)
  useEffect(() => {
    if (!enabled) return
    let x0: number | null = null
    let y0 = 0
    const start = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t.clientX < 24) {
        x0 = t.clientX
        y0 = t.clientY
      }
    }
    const move = (e: TouchEvent) => {
      if (x0 === null) return
      const t = e.touches[0]
      if (t.clientX - x0 > 60 && Math.abs(t.clientY - y0) < 40) {
        setOpen(true)
        x0 = null
      }
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
    }
  }, [enabled, setOpen])
}

/* ================================================================
   Shell
   ================================================================ */

export function AppShell() {
  const { t } = useTranslation()
  const setDrawer = useUI((s) => s.setDrawer)
  const location = useLocation()
  const isSm = useMedia('(min-width: 640px)')
  const isLg = useMedia('(min-width: 1024px)')
  const [createOpen, setCreateOpen] = useState(false)
  useEdgeSwipe(!isSm)

  useEffect(() => setDrawer(false), [location.pathname, setDrawer])

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-canvas">
        {t('nav.skipToContent')}
      </a>
      <div className="flex">
        {isLg && (
          <aside className="sticky top-0 h-dvh w-[252px] shrink-0 p-3">
            <Sidebar />
          </aside>
        )}
        <div className="min-w-0 flex-1">
          {!isLg && <MobileTop onMenu={() => setDrawer(true)} />}
          {isLg && <OfflineBanner />}
          <main id="main" tabIndex={-1} className="pb-[calc(64px+env(safe-area-inset-bottom)+28px)] focus:outline-none sm:pb-12">
            <Outlet />
          </main>
        </div>
      </div>
      <Drawer />
      {!isSm && <TabBar onCreate={() => setCreateOpen(true)} />}
      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
