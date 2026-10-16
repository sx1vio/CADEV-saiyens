import { Languages, Menu, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router';
import { setLanguage, useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import { useUI } from '@/stores/app';
import { Button, ButtonLink } from '../ui/button';
import { Sheet } from '../ui/overlay';
import { NetworkIndicator, OfflineBanner } from './network';

// Trois portes d'entrée seulement : le reste se découvre une fois connecté.
const LINKS = [
  { to: '/videos', label: 'Vidéos' },
  { to: '/emplois', label: 'Emplois' },
  { to: '/apprendre', label: 'Apprendre' },
];

/** Logo : « Dev » fin, « Hub » gras, invite de terminal « >_ ». */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-label="DevHub"
      className={cn(
        'inline-flex items-baseline text-[21px] leading-none tracking-[-0.03em] text-fg',
        className,
      )}
    >
      <span aria-hidden className="font-light">
        Dev
      </span>
      <span
        aria-hidden
        className="font-extrabold text-[color:color-mix(in_oklab,currentColor_86%,#8fb3e8)]"
      >
        Hub
      </span>
      <span aria-hidden className="ml-[3px] font-mono text-[0.4em] font-semibold opacity-75">
        &gt;_
      </span>
    </span>
  );
}

/** Shell des visiteurs sans compte (T1) : pages publiques lisibles sans connexion. */
export function PublicShell() {
  const { t } = useTranslation();
  const lang = useLang();
  const { theme, setTheme } = useUI();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label={t('app.name')}>
            <Logo />
          </Link>
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label={t('nav.menu')}>
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors',
                    isActive ? 'lg-tint' : 'text-fg hover:bg-surface-1',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NetworkIndicator compact />
            <ButtonLink to="/connexion" variant="ghost" size="sm" className="hidden sm:inline-flex">
              {t('nav.login')}
            </ButtonLink>
            <ButtonLink to="/inscription" variant="primary" size="sm">
              Créer un compte
            </ButtonLink>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={t('nav.menu')}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
        <OfflineBanner />
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="dh-ink mt-16 text-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t('app.madeIn')}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => setLanguage(lang === 'fr' ? 'en' : 'fr')}
              className="inline-flex items-center gap-1.5 hover:text-white"
            >
              <Languages className="size-4" />
              {lang === 'fr' ? 'English' : 'Français'}
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center gap-1.5 hover:text-white"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
            </button>
            <Link to="/regles" className="hover:text-white">
              {t('landing.footerRules')}
            </Link>
            <Link to="/systalink" className="hover:text-white">
              {t('nav.systalink')}
            </Link>
            <Link to="/impact" className="hover:text-white">
              {t('nav.impact')}
            </Link>
          </div>
        </div>
      </footer>
      <Sheet open={open} onOpenChange={setOpen} title={t('nav.menu')} size="sm">
        <nav className="flex flex-col gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex h-12 items-center rounded-[8px] px-3 text-[15px] font-medium',
                  isActive ? 'bg-surface-3 text-fg' : 'text-muted',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              icon={theme === 'dark' ? <Sun /> : <Moon />}
            >
              {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setLanguage(lang === 'fr' ? 'en' : 'fr')}
              icon={<Languages />}
            >
              {lang === 'fr' ? 'English' : 'Français'}
            </Button>
          </div>
        </nav>
      </Sheet>
    </div>
  );
}
