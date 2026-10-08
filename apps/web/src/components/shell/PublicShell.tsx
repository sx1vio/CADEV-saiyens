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

const LINKS = [
  { to: '/videos', label: 'Vidéos' },
  { to: '/emplois', label: 'Emplois' },
  { to: '/certifications', label: 'Certifications' },
  { to: '/apprendre', label: 'Apprendre' },
  { to: '/creer', label: 'Créer avec l’IA' },
  { to: '/sos', label: 'Entraide' },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.03em] text-fg',
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-[10px] bg-accent-strong text-white">
        <svg viewBox="0 0 64 64" className="size-[22px]" aria-hidden>
          <path
            d="M24 20 14 32l10 12M40 20l10 12-10 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="32" r="5" fill="currentColor" />
        </svg>
      </span>
      DevHub
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
                    isActive ? 'bg-fg text-canvas' : 'text-fg hover:bg-surface-1',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NetworkIndicator compact />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('nav.theme')}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden sm:inline-flex"
            >
              {theme === 'dark' ? (
                <Sun className="size-[18px]" />
              ) : (
                <Moon className="size-[18px]" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(lang === 'fr' ? 'en' : 'fr')}
              className="hidden uppercase sm:inline-flex"
              icon={<Languages />}
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </Button>
            <ButtonLink to="/connexion" variant="primary" size="sm">
              {t('nav.login')}
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
      <footer className="mt-10 bg-black text-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t('app.madeIn')}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
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
                  'flex h-12 items-center rounded-[12px] px-3 text-[15px] font-medium',
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
