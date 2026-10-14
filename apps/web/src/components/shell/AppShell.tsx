import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Bell,
  ChevronsUpDown,
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
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { relativeTime, setLanguage, useLang } from '@/i18n';
import { useQuery, invalidate } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api } from '@/services';
import { useUserStream } from '@/services/realtime';
import { useSession, useUI } from '@/stores/app';
import { serverLogout } from '@/platform/auth';
import { DropMenu, MenuItem, MenuLabel, MenuSeparator, Sheet, useMedia } from '../ui/overlay';
import { Avatar, CountDot, Kbd } from '../ui/primitives';
import {
  ADMIN_NAV,
  CREATE_NAV,
  EXPLORE_NAV,
  MAIN_NAV,
  isEcosystemPreview,
  type NavEntry,
} from './nav';
import { NetworkIndicator, OfflineBanner } from './network';
import { Logo as Wordmark } from './PublicShell';
import * as Popover from '@radix-ui/react-popover';

/* ================================================================
   Shell connecté (docs/front/design-system.md) : barre latérale à plat,
   sans rayon ; entrée active en encre ; l’accent reste rare.
   ================================================================ */

/** Logo cliquable vers l’accueil. */
function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center" aria-label="DevHub, accueil">
      <Wordmark />
    </Link>
  );
}

function useCreateActions() {
  const nav = useNavigate();
  const setAsk = useUI((s) => s.setAsk);
  return [
    {
      icon: PenSquare,
      label: 'Publier un post',
      hint: 'Fil et communautés',
      run: () => nav('/publier'),
    },
    { icon: Zap, label: 'Je suis bloqué', hint: 'Demander de l’aide', run: () => setAsk(true) },
    {
      icon: Briefcase,
      label: 'Publier une offre',
      hint: 'Espace entreprise',
      run: () => nav('/emplois/publier'),
    },
    {
      icon: FolderPlus,
      label: 'Ouvrir un projet',
      hint: 'Trouver des contributeurs',
      run: () => nav('/projets/nouvelle'),
    },
    {
      icon: Wand2,
      label: 'Créer une app avec l’IA',
      hint: 'Guide étape par étape',
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
  const actions = useCreateActions();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Créer">
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

/** Entrée de menu : pilule anthracite, lavande quand active, badge rouge. */
function SideItem({
  entry,
  active,
  count,
  onNavigate,
  tall,
}: {
  entry: NavEntry;
  active: boolean;
  count?: number;
  onNavigate?: () => void;
  /** Tiroir mobile : cibles tactiles de 44 px */
  tall?: boolean;
}) {
  const Icon = entry.icon;
  return (
    <Link
      to={entry.to}
      onClick={onNavigate}
      data-tour={entry.tour}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-[8px] pr-1.5 pl-3 text-[13.5px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
        tall ? 'h-11' : 'h-9',
        active ? 'lg-tint' : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      <span className="flex-1 truncate">
        {entry.short && entry.label.length > 22 ? entry.short : entry.label}
      </span>
      {!!count && (
        <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-badge px-1.5 text-[11px] font-semibold text-white tabular">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

interface NavGroup {
  label?: string;
  items: NavEntry[];
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const setPalette = useUI((s) => s.setPalette);
  const setAsk = useUI((s) => s.setAsk);
  const isActive = useIsActive();
  const actions = useCreateActions();
  const { data: home } = useQuery(me ? 'home' : null, () => api.getHome());
  const help = home?.openInMyStacks.length ?? 0;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const drawer = !!onNavigate;
  // Trois groupes : l'essentiel, puis Explorer et Créer.
  const groups: NavGroup[] = [
    { items: MAIN_NAV },
    { label: 'Explorer', items: EXPLORE_NAV },
    { label: 'Créer', items: [...CREATE_NAV, ...(me?.isAdmin ? [ADMIN_NAV] : [])] },
  ];
  const iconBtn =
    'relative grid size-9 place-items-center rounded-full text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-accent';

  return (
    <div data-tour="nav" className="dh-ink flex h-full flex-col rounded-[10px] p-3">
      {/* Marque et notifications */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-4">
        <Link to="/" onClick={onNavigate} aria-label="DevHub, accueil" className="mr-auto">
          <Wordmark className="text-white" />
        </Link>
        {me && (
          <Notifications
            trigger={(unread) => (
              <button
                type="button"
                aria-label={
                  unread > 0
                    ? `${t('nav.notifications')} (${unread} non lues)`
                    : t('nav.notifications')
                }
                className={iconBtn}
              >
                <Bell className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-badge ring-2 ring-[#18202b]" />
                )}
              </button>
            )}
          />
        )}
        {drawer && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Fermer le menu"
            className={iconBtn}
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Recherche et création */}
      <div className="flex gap-2 pb-4">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            setPalette(true);
          }}
          data-tour="palette"
          className="lg-clear flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 text-left text-[13px] !text-white/60"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate" title={isMac ? '⌘K' : 'Ctrl K'}>
            Rechercher
          </span>
        </button>
        {me && (
          <DropMenu
            align="start"
            trigger={
              <button
                type="button"
                aria-label="Créer"
                data-tour="ask"
                className="lg-tint grid size-10 shrink-0 place-items-center rounded-full"
              >
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

      {/* Navigation : défile avec un fondu en haut et en bas, jamais une coupe nette */}
      <nav
        aria-label="Navigation principale"
        className="no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-2 pb-3 [mask-image:linear-gradient(to_bottom,transparent,black_8px,black_calc(100%-20px),transparent)]"
      >
        {groups.map((g, i) => (
          <div
            key={g.label ?? i}
            role="group"
            aria-label={g.label}
            className="flex flex-col gap-0.5"
          >
            {g.label && (
              <p className="px-3 pb-1 text-[12px] font-medium text-white/45">{g.label}</p>
            )}
            {g.items.map((e) => (
              <SideItem
                key={e.to}
                entry={e}
                active={isActive(e)}
                count={e.to === '/sos' ? help : undefined}
                onNavigate={onNavigate}
                tall={drawer}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Action clé de la plateforme, en encart (seulement s'il reste de la hauteur) */}
      {me && (
        <div className="dh-glow mt-3 hidden rounded-[10px] p-3.5 [@media(min-height:1000px)]:block">
          <p className="text-[13.5px] leading-snug font-semibold">Bloqué sur un bug ?</p>
          <p className="mt-0.5 text-[12px] leading-snug text-white/80">
            Une piste en quelques secondes, puis un dev qui a déjà résolu le même problème.
          </p>
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              setAsk(true);
            }}
            className="lg-clear mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold"
          >
            <Zap className="size-3.5" />
            Demander de l’aide
          </button>
        </div>
      )}

      {/* Compte : une seule carte, le menu porte profil, réglages, thème, langue et déconnexion */}
      <div className="mt-3 border-t border-white/[0.07] pt-3">
        {me ? (
          <UserMenu
            trigger={
              <button
                type="button"
                data-tour="passport"
                className="flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Avatar name={me.displayName} src={me.avatarUrl} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-white">
                    {me.displayName}
                  </span>
                  <span className="block truncate text-[12px] text-white/50">@{me.handle}</span>
                </span>
                <ChevronsUpDown className="size-4 shrink-0 text-white/40" />
              </button>
            }
          />
        ) : (
          <Link
            to="/connexion"
            className="flex h-10 items-center justify-center rounded-[8px] bg-accent-strong text-[13.5px] font-semibold text-white"
          >
            {t('nav.login')}
          </Link>
        )}
      </div>
    </div>
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
  const href = (p: Record<string, string | number>) =>
    p.questionId ? `/sos/${p.questionId}` : p.code ? `/p/${p.code}` : '/';
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
          side="right"
          sideOffset={12}
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
                    onClick={() => nav(href(n.payload))}
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
  const picks = ['awa-kone', 'moussa-diop', 'kwame-dev', 'ousmane-sow', 'devhub-admin'];
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
  const tabs = [MAIN_NAV[0], MAIN_NAV[3], null, EXPLORE_NAV[2], EXPLORE_NAV[1]];
  return (
    <nav
      aria-label="Navigation"
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
                  {tab.short}
                </>
              )}
            </NavLink>
          ) : (
            <div key="create" className="flex justify-center">
              <button
                type="button"
                onClick={onCreate}
                aria-label="Créer"
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
          <aside className="sticky top-0 h-dvh w-[252px] shrink-0 p-3">
            <Sidebar />
          </aside>
        )}
        <div className="min-w-0 flex-1">
          {!isLg && <MobileTop onMenu={() => setDrawer(true)} />}
          {isLg && <OfflineBanner />}
          {api.mode === 'local' ? (
            <LocalDataBanner />
          ) : (
            isEcosystemPreview(location.pathname) && <EcosystemBanner />
          )}
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

function EcosystemBanner() {
  const { t } = useTranslation();
  return (
    <p
      role="status"
      className="border-b border-line bg-surface-2 px-4 py-1.5 text-center text-xs text-muted"
    >
      {t('common.ecosystemPreview')}
    </p>
  );
}
