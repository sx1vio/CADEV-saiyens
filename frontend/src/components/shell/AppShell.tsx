import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Home,
  Keyboard,
  Languages,
  LifeBuoy,
  ListChecks,
  LogOut,
  Map,
  Menu,
  MessagesSquare,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserRound,
  Users,
  Compass,
  Zap,
  Inbox,
  ArrowLeft,
  Repeat,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router'
import { relativeTime, setLanguage, useLang } from '@/i18n'
import { useQuery, invalidate } from '@/lib/query'
import { cn } from '@/lib/utils'
import { api, type RoomDetail } from '@/services'
import { useSession, useUI } from '@/stores/app'
import { RoomMark } from '../domain'
import { Button } from '../ui/button'
import { DropMenu, MenuItem, MenuLabel, MenuSeparator, Tip, useMedia } from '../ui/overlay'
import { Avatar, CountDot, Kbd } from '../ui/primitives'
import { ADMIN_NAV, COMMUNITY_NAV, PLATFORM_NAV, type NavEntry } from './nav'
import { NetworkIndicator, OfflineBanner } from './network'
import * as Popover from '@radix-ui/react-popover'

/* ================================================================
   Rail des espaces (façon Discord) : le QG + mes salles de projet.
   ================================================================ */

function Rail({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const me = useSession((s) => s.user)
  const { data: rooms } = useQuery(me ? `rooms:mine:${me.id}` : null, () => api.listRooms({ mine: true }))
  const roomMatch = useMatch('/p/:code/*')
  const activeCode = roomMatch?.params.code
  const inHub = !activeCode
  return (
    <nav aria-label={t('nav.sectionMyRooms')} className="flex h-full w-[var(--rail-w)] shrink-0 flex-col items-center gap-2 bg-rail py-3">
      <RailItem to="/" label={`${t('app.name')} · ${t('nav.home')}`} active={inHub} onNavigate={onNavigate}>
        <img src="/favicon.svg" alt="" className="size-full" />
      </RailItem>
      <span className="my-1 h-px w-8 bg-line-strong" aria-hidden />
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto py-1">
        {rooms?.map((r) => (
          <RailItem key={r.id} to={`/p/${r.inviteCode}`} label={r.name} active={activeCode === r.inviteCode} onNavigate={onNavigate} badge={r.ownerId === me?.id ? 0 : 0}>
            <RoomMark name={r.name} size={44} className="rounded-[inherit]" />
          </RailItem>
        ))}
        <Tip label={t('nav.newRoom')} side="right">
          <Link
            to="/projets/nouvelle"
            onClick={onNavigate}
            aria-label={t('nav.newRoom')}
            className="rail-item grid size-11 place-items-center bg-surface-2 text-success hover:bg-success hover:text-canvas"
          >
            <Plus className="size-5" />
          </Link>
        </Tip>
        <Tip label={t('nav.discover')} side="right">
          <Link to="/decouvrir" onClick={onNavigate} aria-label={t('nav.discover')} className="rail-item grid size-11 place-items-center bg-surface-2 text-muted hover:bg-accent-strong hover:text-on-accent">
            <Compass className="size-5" />
          </Link>
        </Tip>
      </div>
      {me && (
        <Tip label={t('nav.myPassport')} side="right">
          <Link to={`/u/${me.handle}`} onClick={onNavigate} className="mt-1 rounded-full ring-offset-2 ring-offset-rail transition-shadow hover:ring-2 hover:ring-accent" aria-label={t('nav.myPassport')}>
            <Avatar name={me.displayName} src={me.avatarUrl} size={40} />
          </Link>
        </Tip>
      )}
    </nav>
  )
}

function RailItem({ to, label, active, children, onNavigate, badge }: { to: string; label: string; active: boolean; children: ReactNode; onNavigate?: () => void; badge?: number }) {
  return (
    <Tip label={label} side="right">
      <div className="rail-wrap relative flex w-full justify-center" data-active={active}>
        <span className="rail-pill top-1/2 -translate-y-1/2" aria-hidden />
        <Link
          to={to}
          onClick={onNavigate}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          data-active={active}
          className="rail-item relative grid size-11 place-items-center overflow-hidden"
        >
          {children}
        </Link>
        {!!badge && <CountDot count={badge} className="absolute -right-0 -bottom-0.5" />}
      </div>
    </Tip>
  )
}

/* ================================================================
   Colonne de navigation contextuelle (image 04 : repliable + coins inversés)
   ================================================================ */

function NavItem({ entry, collapsed, count, onNavigate }: { entry: NavEntry; collapsed: boolean; count?: number; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const Icon = entry.icon
  const active = !!useMatch({ path: entry.to, end: !!entry.end })
  const link = (
    <Link
      to={entry.to}
      onClick={onNavigate}
      data-tour={entry.tour}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'nav-merge flex h-10 items-center gap-3 rounded-[12px] text-[14px] font-medium transition-colors duration-150',
        collapsed ? 'justify-center px-0' : 'px-3',
        !active && 'text-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      <Icon className={cn('size-[18px] shrink-0 transition-colors', active && 'text-accent-text')} />
      {!collapsed && <span className="flex-1 truncate">{t(entry.key)}</span>}
      {!collapsed && !!count && <CountDot count={count} />}
      {collapsed && !!count && <span className="absolute top-1.5 right-3 size-2 rounded-full bg-badge" />}
    </Link>
  )
  return (
    <div className="pl-2.5">
      {collapsed ? (
        <Tip label={t(entry.key)} side="right" shortcut={entry.shortcut}>
          {link}
        </Tip>
      ) : (
        link
      )}
    </div>
  )
}

function HubNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const me = useSession((s) => s.user)
  const setAsk = useUI((s) => s.setAsk)
  const { data: home } = useQuery(me ? 'home' : null, () => api.getHome())
  const sosCount = home?.openInMyStacks.length ?? 0
  return (
    <>
      <div className="flex flex-col gap-1">
        {!collapsed && <p className="label-caps px-5 pt-1 pb-1.5">{t('nav.sectionCommunity')}</p>}
        {COMMUNITY_NAV.map((e) => (
          <NavItem key={e.to} entry={e} collapsed={collapsed} count={e.to === '/sos' ? sosCount : undefined} onNavigate={onNavigate} />
        ))}
        {me && <NavItem entry={{ to: `/u/${me.handle}`, key: 'nav.passport', icon: UserRound, tour: 'passport' }} collapsed={collapsed} onNavigate={onNavigate} />}
      </div>
      <div className="mt-5 flex flex-col gap-1">
        {!collapsed && <p className="label-caps px-5 pb-1.5">{t('nav.sectionPlatform')}</p>}
        {PLATFORM_NAV.map((e) => (
          <NavItem key={e.to} entry={e} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        {me?.isAdmin && <NavItem entry={ADMIN_NAV} collapsed={collapsed} onNavigate={onNavigate} />}
      </div>
      <div className="mt-auto pt-4 pr-2.5 pl-2.5">
        {collapsed ? (
          <Tip label={t('nav.ask')} side="right" shortcut={['N']}>
            <Button variant="hero" size="icon" className="w-full" aria-label={t('nav.ask')} onClick={() => setAsk(true)} data-tour="ask">
              <Zap />
            </Button>
          </Tip>
        ) : (
          <div className="glow-border overflow-hidden rounded-[18px] bg-surface-2 p-3.5">
            <p className="text-sm font-semibold text-fg">{t('home.heroTitle')}</p>
            <p className="mt-1 text-xs text-muted">{t('ask.subtitle')}</p>
            <Button variant="hero" size="sm" className="mt-3 w-full" icon={<Zap />} onClick={() => setAsk(true)} data-tour="ask">
              {t('nav.ask')}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

function RoomNav({ code, collapsed, onNavigate }: { code: string; collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { data: room } = useQuery<RoomDetail>(`room:${code}`, () => api.getRoom(code))
  const [params] = useSearchParams()
  const tab = params.get('tab') ?? 'tasks'
  const items = [
    { tab: 'tasks', icon: ListChecks, key: 'room.tabs.tasks', count: room?.openTasks },
    { tab: 'discussion', icon: MessagesSquare, key: 'room.tabs.discussion' },
    { tab: 'members', icon: Users, key: 'room.tabs.members' },
    ...(room?.myMembership === 'owner' ? [{ tab: 'requests', icon: Inbox, key: 'room.tabs.requests', count: room.requests.length }] : []),
  ]
  return (
    <>
      <div className={cn('mb-4 flex items-center gap-3', collapsed ? 'justify-center px-2' : 'px-5')}>
        {room ? <RoomMark name={room.name} size={collapsed ? 36 : 40} /> : <span className="size-10 rounded-[12px] skeleton" />}
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg">{room?.name ?? '…'}</p>
            <p className="truncate text-xs text-subtle">{room?.repoFullName}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {items.map((it) => {
          const active = tab === it.tab
          const Icon = it.icon
          const link = (
            <Link
              to={`/p/${code}?tab=${it.tab}`}
              onClick={onNavigate}
              data-active={active}
              aria-current={active ? 'page' : undefined}
              className={cn('nav-merge flex h-10 items-center gap-3 rounded-[12px] text-[14px] font-medium transition-colors', collapsed ? 'justify-center' : 'px-3', !active && 'text-muted hover:bg-surface-2 hover:text-fg')}
            >
              <Icon className={cn('size-[18px]', active && 'text-accent-text')} />
              {!collapsed && <span className="flex-1">{t(it.key)}</span>}
              {!collapsed && !!it.count && <CountDot count={it.count} />}
            </Link>
          )
          return (
            <div key={it.tab} className="pl-2.5">
              {collapsed ? (
                <Tip label={t(it.key)} side="right">
                  {link}
                </Tip>
              ) : (
                link
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-6 pl-2.5">
        <Link to="/projets" onClick={onNavigate} className={cn('flex h-10 items-center gap-3 rounded-[12px] text-sm text-subtle transition-colors hover:bg-surface-2 hover:text-fg', collapsed ? 'justify-center' : 'px-3')}>
          <ArrowLeft className="size-4" />
          {!collapsed && t('nav.projects')}
        </Link>
      </div>
    </>
  )
}

function SideNav({ collapsed, onNavigate, showToggle = true }: { collapsed: boolean; onNavigate?: () => void; showToggle?: boolean }) {
  const { t } = useTranslation()
  const toggle = useUI((s) => s.toggleNav)
  const roomMatch = useMatch('/p/:code/*')
  return (
    <div
      className={cn('relative flex h-full shrink-0 flex-col bg-nav pt-4 pb-4 transition-[width] duration-300 ease-out', collapsed ? 'w-[76px]' : 'w-[var(--nav-w)]')}
      data-tour="nav"
    >
      <div className={cn('mb-5 flex items-center', collapsed ? 'justify-center' : 'justify-between px-5')}>
        {!collapsed && (
          <Link to="/" onClick={onNavigate} className="text-[17px] font-bold tracking-tight text-fg">
            DevHub<span className="text-accent-text">.</span>
          </Link>
        )}
        {showToggle && (
          <Tip label={collapsed ? t('nav.expand') : t('nav.collapse')} side="right" shortcut={['[']}>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
              className="grid size-7 place-items-center rounded-full bg-surface-2 text-muted shadow-raised transition-colors hover:text-fg"
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          </Tip>
        )}
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
        {roomMatch ? <RoomNav code={roomMatch.params.code!} collapsed={collapsed} onNavigate={onNavigate} /> : <HubNav collapsed={collapsed} onNavigate={onNavigate} />}
      </div>
    </div>
  )
}

/* ================================================================
   Barre du haut
   ================================================================ */

function Notifications() {
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
        <button type="button" aria-label={t('nav.notifications')} className="relative grid size-9 place-items-center rounded-full bg-surface-2 text-muted transition-colors hover:text-fg">
          <Bell className="size-[18px]" />
          {unread > 0 && <CountDot count={unread} className="absolute -top-1 -right-1 h-[18px] min-w-[18px] text-[10px]" />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="dh-pop z-[60] w-[min(380px,calc(100vw-24px))] rounded-[18px] border border-line bg-surface-2 shadow-lg">
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
                    className="flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-surface-3"
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-badge')} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-snug text-fg">{t(`notif.${n.type}`, n.payload)}</span>
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

function UserMenu() {
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
        <button type="button" className="rounded-full ring-offset-2 ring-offset-canvas transition-shadow hover:ring-2 hover:ring-accent" aria-label={me.displayName}>
          <Avatar name={me.displayName} src={me.avatarUrl} size={36} />
        </button>
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

function TopBar({ onMenu, showMenu }: { onMenu: () => void; showMenu: boolean }) {
  const { t } = useTranslation()
  const setPalette = useUI((s) => s.setPalette)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklab,var(--bg-base),transparent_12%)] backdrop-blur-xl">
      <div className="flex h-[var(--topbar-h)] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {showMenu && (
          <Button variant="ghost" size="icon" aria-label={t('nav.menu')} onClick={onMenu} className="-ml-1">
            <Menu className="size-5" />
          </Button>
        )}
        <Link to="/" className="flex items-center gap-2 sm:hidden" aria-label={t('app.name')}>
          <img src="/favicon.svg" alt="" className="size-8" />
        </Link>
        <button
          type="button"
          onClick={() => setPalette(true)}
          data-tour="palette"
          className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-[12px] border border-line bg-surface-1 px-3 text-left text-sm text-subtle shadow-inset transition-colors hover:border-line-strong sm:max-w-md"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">{t('nav.searchPlaceholder')}</span>
          <span className="ml-auto hidden items-center gap-0.5 sm:flex">
            <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <NetworkIndicator compact={false} className="hidden md:inline-flex" />
          <NetworkIndicator compact className="md:hidden" />
          <Notifications />
          <UserMenu />
        </div>
      </div>
      <OfflineBanner />
    </div>
  )
}

/* ================================================================
   Barre d'onglets mobile (< 640 px)
   ================================================================ */

function TabBar() {
  const { t } = useTranslation()
  const setAsk = useUI((s) => s.setAsk)
  const tabs = [
    { to: '/', icon: Home, key: 'nav.home', end: true },
    { to: '/sos', icon: LifeBuoy, key: 'nav.sos' },
    null,
    { to: '/projets', icon: FolderGit2, key: 'nav.projects' },
    { to: '/decouvrir', icon: Compass, key: 'nav.discover' },
  ]
  return (
    <nav aria-label={t('nav.menu')} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_oklab,var(--surface-1),transparent_6%)] pb-safe backdrop-blur-xl sm:hidden">
      <div className="grid h-[var(--tabbar-h)] grid-cols-5 items-center">
        {tabs.map((tab) =>
          tab ? (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => cn('flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors', isActive ? 'text-fg' : 'text-subtle')}
            >
              {({ isActive }) => (
                <>
                  <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-accent-soft text-accent-text')}>
                    <tab.icon className="size-5" />
                  </span>
                  {t(tab.key)}
                </>
              )}
            </NavLink>
          ) : (
            <div key="ask" className="flex justify-center">
              <button
                type="button"
                onClick={() => setAsk(true)}
                aria-label={t('nav.ask')}
                data-tour="ask-mobile"
                className="-mt-6 grid size-14 place-items-center rounded-[20px] bg-hero text-on-hero shadow-accent ring-4 ring-canvas transition-transform active:scale-95"
              >
                <Zap className="size-6" />
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

function Drawer({ withRail }: { withRail: boolean }) {
  const { t } = useTranslation()
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
          className="dh-drawer fixed inset-y-0 left-0 z-50 flex max-w-[88vw] overflow-hidden rounded-r-[24px] shadow-lg focus:outline-none"
          style={{ transform: dx < 0 ? `translateX(${dx}px)` : undefined, transition: startX.current === null ? 'transform 220ms var(--ease-out)' : 'none' }}
          onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
          onTouchMove={(e) => startX.current !== null && setDx(Math.min(0, e.touches[0].clientX - startX.current))}
          onTouchEnd={() => {
            if (dx < -80) close()
            startX.current = null
            setDx(0)
          }}
        >
          <DialogPrimitive.Title className="sr-only">{t('nav.menu')}</DialogPrimitive.Title>
          {withRail && <Rail onNavigate={close} />}
          <SideNav collapsed={false} onNavigate={close} showToggle={false} />
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
  const collapsedPref = useUI((s) => s.navCollapsed)
  const setDrawer = useUI((s) => s.setDrawer)
  const location = useLocation()
  const isSm = useMedia('(min-width: 640px)')
  const isLg = useMedia('(min-width: 1024px)')
  useEdgeSwipe(!isSm)

  useEffect(() => setDrawer(false), [location.pathname, setDrawer])

  return (
    <div className="flex min-h-dvh bg-nav">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-accent-strong focus:px-3 focus:py-2 focus:text-on-accent">
        {t('nav.skipToContent')}
      </a>
      {isSm && (
        <div className="sticky top-0 hidden h-dvh sm:block">
          <Rail />
        </div>
      )}
      {isLg && (
        <div className="sticky top-0 hidden h-dvh lg:block">
          <SideNav collapsed={collapsedPref} />
        </div>
      )}
      <div className="relative flex min-w-0 flex-1 flex-col bg-canvas sm:rounded-l-[24px] lg:rounded-l-[24px]">
        <TopBar showMenu={!isLg} onMenu={() => setDrawer(true)} />
        <main id="main" tabIndex={-1} className="flex-1 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+16px)] focus:outline-none sm:pb-10">
          <Outlet />
        </main>
      </div>
      {!isLg && <Drawer withRail={!isSm} />}
      {!isSm && <TabBar />}
    </div>
  )
}
