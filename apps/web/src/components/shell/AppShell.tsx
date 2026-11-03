import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Flame,
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
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { relativeTime, setLanguage, useLang } from '@/i18n';
import { useQuery, invalidate } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api, type AppNotification } from '@/services';
import { useUserStream } from '@/services/realtime';
import { useSession, useUI } from '@/stores/app';
import { serverLogout } from '@/platform/auth';
import { DropMenu, MenuItem, MenuLabel, MenuSeparator, Sheet, useMedia } from '../ui/overlay';
import { Avatar, CountDot, Kbd } from '../ui/primitives';
import { CREATE_NAV, EXPLORE_NAV, MAIN_NAV, NETWORK_NAV, type NavEntry } from './nav';
import { NetworkIndicator, OfflineBanner } from './network';
import { AnnouncementBar } from './announcements';
import { Djeli } from '../djeli';
import { BrandLogo } from '../brand';
import { selectGoalReached, selectStreak, usePlatform } from '@/platform/store';
import * as Popover from '@radix-ui/react-popover';

/* ================================================================
   Shell connecté : barre latérale bleue (charte DevHub). L'entrée active prend la couleur
   du contenu et s'y fond par deux coins inversés ; Djeli rappelle la série d'apprentissage
   en pied. Sur ordinateur, recherche, création, notifications et compte sont dans la barre du haut.
   ================================================================ */

/** Logo cliquable vers l’accueil. */
function Logo({ dark = true }: { dark?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to="/" className="flex shrink-0 items-center" aria-label={t('pub.homeAria')}>
      <BrandLogo size={34} onDark={dark} />
    </Link>
  );
}

function useCreateActions() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setAsk = useUI((s) => s.setAsk);
  return [
    {
      icon: PenSquare,
      label: t('navEntry.createPost'),
      hint: t('navEntry.createPostHint'),
      run: () => nav('/publier'),
    },
    { icon: Zap, label: t('nav.ask'), hint: t('navEntry.askHint'), run: () => setAsk(true) },
    {
      icon: FolderPlus,
      label: t('navEntry.createRoom'),
      hint: t('navEntry.createRoomHint'),
      run: () => nav('/projets/nouvelle'),
    },
    {
      icon: Wand2,
      label: t('navEntry.createApp'),
      hint: t('navEntry.createAppHint'),
      run: () => nav('/creer'),
    },
  ];
}

function CreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useTranslation();
  const actions = useCreateActions();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('navEntry.create')}>
      <div className="flex flex-col gap-1.5">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => {
              onOpenChange(false);
              a.run();
            }}
            className="flex items-center gap-3 rounded-[10px] bg-surface-1 px-3 py-3 text-left hover:bg-surface-2"
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
  );
}

function useIsActive() {
  const { pathname } = useLocation();
  return (e: NavEntry) =>
    e.end ? pathname === e.to : pathname === e.to || pathname.startsWith(`${e.to}/`);
}

/**
 * Entrée de la barre latérale. Active : pilule couleur du contenu qui « fusionne » avec lui
 * (coins inversés, `.side-merge`), sauf dans le tiroir mobile où elle reste une pilule.
 */
function SideItem({
  entry,
  active,
  count,
  merge,
  onNavigate,
}: {
  entry: NavEntry;
  active: boolean;
  count?: number;
  merge: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const Icon = entry.icon;
  const label = t(entry.label);
  return (
    <Link
      to={entry.to}
      onClick={onNavigate}
      data-tour={entry.tour}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'side-item flex h-10 shrink-0 items-center gap-3 pl-4 text-[13.5px] font-medium',
        merge ? 'side-merge rounded-l-[16px] pr-4' : 'mr-3 rounded-[14px] pr-3',
        active
          ? 'bg-canvas font-semibold text-accent-text'
          : 'text-white/80 hover:bg-white/10 hover:text-white',
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      <span className="flex-1 truncate">
        {entry.short && label.length > 22 ? t(entry.short) : label}
      </span>
      {!!count && (
        <span
          className={cn(
            'grid h-5 min-w-5 place-items-center rounded-[7px] px-1.5 text-[11px] font-semibold tabular',
            active ? 'bg-accent-soft text-accent-text' : 'bg-white/18 text-white',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

/** Carte de Djeli en pied de barre : la série d'apprentissage du jour (esprit Duolingo). */
function LearnNudge({ onNavigate }: { onNavigate?: () => void }) {
  const streak = usePlatform(selectStreak);
  const today = usePlatform((s) => s.lessonsToday());
  const reached = usePlatform(selectGoalReached);
  return (
    <Link
      to="/apprendre"
      onClick={onNavigate}
      className="side-nudge relative mx-3 mt-3 flex items-end gap-2 rounded-[20px] bg-white/10 p-3 pt-2 text-white transition-colors hover:bg-white/15"
    >
      <div className="min-w-0 flex-1 pb-0.5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Flame className="size-4 text-[#ffb547]" />
          {streak > 0 ? `${streak} jour${streak > 1 ? 's' : ''} de suite` : 'Lance ta série'}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-white/70">
          {reached
            ? 'Objectif du jour atteint. Bravo !'
            : today > 0
              ? 'Encore une leçon pour ton objectif ?'
              : 'Une leçon de quelques minutes aujourd’hui ?'}
        </p>
      </div>
      <Djeli pose={reached ? 'celebrate' : 'point'} size={58} className="-mt-6 -mr-1" />
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const isActive = useIsActive();
  const { pathname } = useLocation();
  const { data: home } = useQuery(me ? 'home' : null, () => api.getHome());
  const help = home?.openInMyStacks.length ?? 0;
  const enrolled = usePlatform((s) => s.enrolled.length);
  const savedJobs = usePlatform((s) => s.savedJobs.length);
  const merge = !onNavigate;
  const navRef = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  const [less, setLess] = useState(false);
  const updateMore = () => {
    const el = navRef.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    setLess(el.scrollTop > 8);
  };
  useEffect(() => {
    updateMore();
    window.addEventListener('resize', updateMore);
    return () => window.removeEventListener('resize', updateMore);
  }, []);
  const groups: { label?: string; items: NavEntry[] }[] = [
    { items: MAIN_NAV },
    { label: t('navEntry.explore'), items: EXPLORE_NAV },
    { label: t('navEntry.create'), items: CREATE_NAV },
    {
      label: t('navEntry.groupNetwork'),
      items: [
        ...(me
          ? [
              {
                to: `/u/${me.handle}`,
                label: 'nav.myPassport',
                icon: UserRound,
                tour: 'passport',
              } as NavEntry,
            ]
          : []),
        NETWORK_NAV[1]!,
      ],
    },
    ...(me
      ? [
          {
            label: t('navEntry.groupAccount'),
            items: [{ to: '/reglages', label: 'nav.settings', icon: Settings } as NavEntry],
          },
        ]
      : []),
  ];
  const counts: Record<string, number | undefined> = {
    '/sos': help,
    '/apprendre': enrolled,
    '/emplois': savedJobs,
  };
  return (
    <div
      data-tour="nav"
      className={cn(
        'side-panel flex h-full flex-col text-white',
        merge ? 'rounded-l-[28px] py-5 pl-3' : 'rounded-[28px] py-4 pl-3',
      )}
    >
      <div className="flex items-center justify-between pr-4 pb-6 pl-2">
        <Logo />
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Fermer le menu"
            className="grid size-9 place-items-center rounded-full text-white/80 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <nav
          ref={navRef}
          onScroll={updateMore}
          aria-label={t('navEntry.navAria')}
          className="side-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain py-4"
        >
          {groups.map((g, i) => (
            <div key={i} className="flex flex-col gap-1">
              {g.label && (
                <p className="px-4 pb-1 text-[11px] font-semibold tracking-[0.06em] text-white/55 uppercase">
                  {g.label}
                </p>
              )}
              {g.items.map((e) => (
                <SideItem
                  key={e.to}
                  entry={e}
                  merge={merge}
                  active={e.to.startsWith('/u/') ? pathname === e.to : isActive(e)}
                  count={counts[e.to]}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>
        {/* Des entrées sont masquées au-dessus ou en dessous : petites flèches qui font défiler d'un cran au clic */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => navRef.current?.scrollBy({ top: -160, behavior: 'smooth' })}
          className={cn(
            'absolute top-0 right-4 z-10 grid size-6 place-items-center rounded-full bg-white/12 text-white/80 transition-opacity duration-200 hover:bg-white/20 hover:text-white',
            less ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <ChevronUp className="size-4 animate-[side-bob-up_1.8s_ease-in-out_infinite]" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => navRef.current?.scrollBy({ top: 160, behavior: 'smooth' })}
          className={cn(
            'absolute right-4 bottom-0 z-10 grid size-6 place-items-center rounded-full bg-white/12 text-white/80 transition-opacity duration-200 hover:bg-white/20 hover:text-white',
            more ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <ChevronDown className="size-4 animate-[side-bob_1.8s_ease-in-out_infinite]" />
        </button>
      </div>

      {me ? (
        <LearnNudge onNavigate={onNavigate} />
      ) : (
        <Link
          to="/connexion"
          onClick={onNavigate}
          className="mx-3 mt-3 flex h-11 items-center justify-center rounded-[14px] bg-white text-[14px] font-semibold text-accent-text"
        >
          {t('nav.login')}
        </Link>
      )}
    </div>
  );
}

/** Barre du haut (≥ 1024 px) : recherche, création, réseau, notifications, compte. */
function TopBar() {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const setPalette = useUI((s) => s.setPalette);
  const actions = useCreateActions();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-6">
        <button
          type="button"
          onClick={() => setPalette(true)}
          data-tour="palette"
          className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full bg-surface-1 pr-2 pl-4 text-left text-[13.5px] text-subtle transition-colors hover:bg-surface-2"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate">{t('nav.searchPlaceholder')}</span>
          <Kbd>{isMac ? '⌘ K' : 'Ctrl K'}</Kbd>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <NetworkIndicator compact />
          {me && (
            <DropMenu
              align="end"
              trigger={
                <button
                  type="button"
                  data-tour="ask"
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  <Plus className="size-[18px]" />
                  {t('navEntry.create')}
                </button>
              }
            >
              {actions.map((a) => (
                <MenuItem
                  key={a.label}
                  icon={<a.icon />}
                  onSelect={a.run}
                  hint={<span className="text-xs text-subtle">{a.hint}</span>}
                >
                  {a.label}
                </MenuItem>
              ))}
            </DropMenu>
          )}
          {me && <Notifications />}
          {me && <UserMenu />}
        </div>
      </div>
    </header>
  );
}

/** Barre du haut mobile et tablette (la barre latérale passe dans un tiroir). */
function MobileTop({ onMenu }: { onMenu: () => void }) {
  const setPalette = useUI((s) => s.setPalette);
  const me = useSession((s) => s.user);
  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Menu"
          className="grid size-10 place-items-center rounded-full hover:bg-surface-1"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPalette(true)}
            aria-label="Rechercher"
            className="grid size-10 place-items-center rounded-full hover:bg-surface-1"
          >
            <Search className="size-5" />
          </button>
          <NetworkIndicator compact />
          {me && <Notifications />}
          {me && <UserMenu />}
        </div>
      </div>
      <OfflineBanner />
    </header>
  );
}

function Notifications({ trigger }: { trigger?: (unread: number) => ReactNode }) {
  const { t } = useTranslation();
  const lang = useLang();
  const nav = useNavigate();
  const me = useSession((s) => s.user);
  const { data } = useQuery(me ? `notifications:${me.id}` : null, () => api.listNotifications());
  const unread = data?.filter((n) => !n.readAt).length ?? 0;
  const href = (n: AppNotification) =>
    n.type === 'application'
      ? `/emplois/${n.payload.jobId}`
      : n.type === 'message'
        ? `/messages/${n.payload.conversationId}`
        : n.type === 'contact'
          ? `/u/${n.payload.by}`
          : n.payload.questionId
            ? `/sos/${n.payload.questionId}`
            : n.payload.code
              ? `/p/${n.payload.code}`
              : '/';
  return (
    <Popover.Root
      onOpenChange={(o) => {
        if (!o && unread) void api.markNotificationsRead().then(() => invalidate('notifications'));
      }}
    >
      <Popover.Trigger asChild>
        {trigger ? (
          trigger(unread)
        ) : (
          <button
            type="button"
            aria-label={t('nav.notifications')}
            className="relative grid size-10 place-items-center rounded-full text-fg transition-colors hover:bg-surface-1"
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <CountDot count={unread} className="absolute top-1 right-1 ring-2 ring-canvas" />
            )}
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          side="bottom"
          sideOffset={10}
          className="dh-pop z-[60] w-[min(380px,calc(100vw-24px))] rounded-[10px] bg-canvas shadow-lg"
        >
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
                    onClick={() => nav(href(n))}
                    className="flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-surface-1"
                  >
                    <span
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        n.readAt ? 'bg-transparent' : 'bg-badge',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug text-fg">
                        {t(`notif.${n.type}`, n.payload)}
                      </span>
                      <span className="mt-0.5 block text-xs text-subtle">
                        {relativeTime(n.createdAt, lang)}
                      </span>
                    </span>
                  </button>
                </Popover.Close>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function UserMenu({ trigger }: { trigger?: ReactNode }) {
  const { t } = useTranslation();
  const lang = useLang();
  const nav = useNavigate();
  const me = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const { theme, setTheme, startTour, setShortcuts } = useUI();
  if (!me) return null;
  return (
    <DropMenu
      trigger={
        trigger ?? (
          <button
            type="button"
            className="rounded-full ring-offset-2 ring-offset-canvas transition-shadow hover:ring-2 hover:ring-accent"
            aria-label={me.displayName}
          >
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
      <MenuItem
        icon={theme === 'dark' ? <Sun /> : <Moon />}
        onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
      </MenuItem>
      <MenuItem
        icon={<Languages />}
        onSelect={() => setLanguage(lang === 'fr' ? 'en' : 'fr')}
        hint={<span className="text-xs text-subtle">{lang === 'fr' ? 'EN' : 'FR'}</span>}
      >
        {t('nav.language')}
      </MenuItem>
      <MenuItem
        icon={<Map />}
        onSelect={() => {
          nav('/');
          startTour();
        }}
      >
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
          await Promise.all([api.logout(), serverLogout()]);
          setUser(null);
          invalidate('');
          nav('/');
        }}
      >
        {t('nav.logout')}
      </MenuItem>
    </DropMenu>
  );
}

function DemoSwitcher() {
  const me = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const nav = useNavigate();
  const { data } = useQuery('demo-accounts', () => api.listDemoAccounts());
  const picks = ['awa-kone', 'moussa-diop', 'kwame-dev', 'ousmane-sow'];
  return (
    <>
      {data
        ?.filter((u) => picks.includes(u.handle) && u.id !== me?.id)
        .map((u) => (
          <MenuItem
            key={u.id}
            icon={<Repeat />}
            onSelect={async () => {
              const user = await api.loginDemo(u.handle);
              setUser(user);
              invalidate('');
              nav('/');
            }}
          >
            {u.displayName}
          </MenuItem>
        ))}
    </>
  );
}

/* ================================================================
   Barre d'onglets mobile (< 640 px)
   ================================================================ */

function TabBar({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  const tabs = [MAIN_NAV[0], MAIN_NAV[3], null, EXPLORE_NAV[2], EXPLORE_NAV[1]];
  return (
    <nav
      aria-label={t('navEntry.navAria')}
      className="fixed inset-x-3 bottom-3 z-40 dh-ink rounded-[10px] pb-safe shadow-lg sm:hidden"
    >
      <div className="grid h-16 grid-cols-5 items-center">
        {tabs.map((tab) =>
          tab ? (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium',
                  isActive ? 'text-white' : 'text-white/55',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-7 w-11 place-items-center rounded-full',
                      isActive && 'bg-accent-strong',
                    )}
                  >
                    <tab.icon className="size-[19px]" />
                  </span>
                  {t(tab.short ?? tab.label)}
                </>
              )}
            </NavLink>
          ) : (
            <div key="create" className="flex justify-center">
              <button
                type="button"
                onClick={onCreate}
                aria-label={t('navEntry.create')}
                data-tour="ask-mobile"
                className="grid size-11 place-items-center rounded-full bg-white text-black active:scale-95"
              >
                <Plus className="size-6" />
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  );
}

/* ================================================================
   Tiroir (mobile et tablette) avec geste de balayage
   ================================================================ */

function Drawer() {
  const open = useUI((s) => s.drawerOpen);
  const setOpen = useUI((s) => s.setDrawer);
  const startX = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  const close = () => setOpen(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dh-overlay fixed inset-0 z-50 bg-[var(--scrim)]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="dh-drawer fixed inset-y-0 left-0 z-50 w-[272px] max-w-[88vw] p-2 focus:outline-none"
          style={{
            transform: dx < 0 ? `translateX(${dx}px)` : undefined,
            transition: startX.current === null ? 'transform 220ms var(--ease-out)' : 'none',
          }}
          onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
          onTouchMove={(e) =>
            startX.current !== null && setDx(Math.min(0, e.touches[0].clientX - startX.current))
          }
          onTouchEnd={() => {
            if (dx < -80) close();
            startX.current = null;
            setDx(0);
          }}
        >
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
          <Sidebar onNavigate={close} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Ouverture du tiroir par balayage depuis le bord gauche (mobile). */
function useEdgeSwipe(enabled: boolean) {
  const setOpen = useUI((s) => s.setDrawer);
  useEffect(() => {
    if (!enabled) return;
    let x0: number | null = null;
    let y0 = 0;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t.clientX < 24) {
        x0 = t.clientX;
        y0 = t.clientY;
      }
    };
    const move = (e: TouchEvent) => {
      if (x0 === null) return;
      const t = e.touches[0];
      if (t.clientX - x0 > 60 && Math.abs(t.clientY - y0) < 40) {
        setOpen(true);
        x0 = null;
      }
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
    };
  }, [enabled, setOpen]);
}

/* ================================================================
   Shell
   ================================================================ */

export function AppShell() {
  const { t } = useTranslation();
  const setDrawer = useUI((s) => s.setDrawer);
  const me = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  // Y8 : notifications en direct ; une session terminée ailleurs (déconnexion) ferme le flux.
  useUserStream(
    me?.id ?? null,
    useCallback(() => setUser(null), [setUser]),
  );
  const location = useLocation();
  const isSm = useMedia('(min-width: 640px)');
  const isLg = useMedia('(min-width: 1024px)');
  const [createOpen, setCreateOpen] = useState(false);
  useEdgeSwipe(!isSm);

  useEffect(() => setDrawer(false), [location.pathname, setDrawer]);

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-canvas"
      >
        {t('nav.skipToContent')}
      </a>
      <div className="flex">
        {isLg && (
          <aside className="sticky top-0 h-dvh w-[256px] shrink-0 py-3 pl-3">
            <Sidebar />
          </aside>
        )}
        <div className="min-w-0 flex-1">
          {!isLg && <MobileTop onMenu={() => setDrawer(true)} />}
          {isLg && <TopBar />}
          {isLg && <OfflineBanner />}
          {api.mode === 'local' && <LocalDataBanner />}
          <AnnouncementBar />
          <main
            id="main"
            tabIndex={-1}
            className="pb-[calc(64px+env(safe-area-inset-bottom)+28px)] focus:outline-none sm:pb-12"
          >
            <Outlet />
          </main>
        </div>
      </div>
      <Drawer />
      {!isSm && <TabBar onCreate={() => setCreateOpen(true)} />}
      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

/** ADR-0016 §4 : en mode simulé (développement), rappel permanent que rien n'est réel. */
function LocalDataBanner() {
  const { t } = useTranslation();
  return (
    <p
      role="status"
      className="border-b border-line bg-surface-2 px-4 py-1.5 text-center text-xs text-muted"
      title={t('common.demoDataHint')}
    >
      {t('common.demoData')}
    </p>
  );
}
