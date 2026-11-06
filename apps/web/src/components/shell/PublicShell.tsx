import {
  Award,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  ChevronDown,
  Compass,
  FolderGit2,
  LifeBuoy,
  Map as MapIcon,
  Menu,
  Moon,
  Newspaper,
  Puzzle,
  Rocket,
  Search,
  ServerCog,
  ShieldCheck,
  Smartphone,
  Sun,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { setLanguage, useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import { useUI } from '@/stores/app';
import { Sheet } from '../ui/overlay';
import { OfflineBanner } from './network';
import { AnnouncementBar } from './announcements';
import { BrandLogo } from '../brand';

export function Logo({ className, onDark }: { className?: string; onDark?: boolean }) {
  return <BrandLogo size={34} onDark={onDark} className={className} />;
}

interface MenuLink {
  to: string;
  label: string;
  text?: string;
  icon?: LucideIcon;
}

/** Menus de l'en-tête : les trois groupes de la navigation de l'application, plus « À propos ». */
const MENUS: { label: string; groups: { title: string; links: MenuLink[] }[] }[] = [
  {
    label: 'Réseau',
    groups: [
      {
        title: 'Échanger',
        links: [
          {
            to: '/connexion?next=%2F',
            label: 'Fil d’actualité',
            text: 'L’actu tech et IA, les questions, les projets',
            icon: Newspaper,
          },
          {
            to: '/connexion?next=%2F%3Ff%3Dquestions',
            label: 'Entraide',
            text: 'Débloqué par un dev qui connaît ta stack',
            icon: LifeBuoy,
          },
          {
            to: '/projets',
            label: 'Projets',
            text: 'Rejoins un projet ou trouve des contributeurs',
            icon: FolderGit2,
          },
        ],
      },
      {
        title: 'Carrière',
        links: [
          {
            to: '/emplois',
            label: 'Emplois et missions',
            text: 'Des offres avec leur lien officiel',
            icon: Briefcase,
          },
          {
            to: '/decouvrir',
            label: 'Développeurs',
            text: 'Par compétence prouvée et par pays',
            icon: Compass,
          },
          {
            to: '/carte',
            label: 'Carte des devs',
            text: 'La communauté, pays par pays',
            icon: MapIcon,
          },
        ],
      },
    ],
  },
  {
    label: 'Progresser',
    groups: [
      {
        title: 'Se former et se prouver',
        links: [
          {
            to: '/certifications',
            label: 'Certifications',
            text: 'Gratuites, corrigées par le serveur, vérifiables',
            icon: Award,
          },
          {
            to: '/skills',
            label: 'Outils IA',
            text: 'Skills, plugins et serveurs MCP pour ton agent',
            icon: Puzzle,
          },
          {
            to: '/sources',
            label: 'Nos sources',
            text: 'D’où vient l’actualité du fil',
            icon: BookOpenCheck,
          },
        ],
      },
    ],
  },
  {
    label: 'Livrer',
    groups: [
      {
        title: 'Du prompt à la prod vérifiée',
        links: [
          {
            to: '/prevol',
            label: 'Pré-vol',
            text: 'Secrets, 3G, failles, licences, charge',
            icon: Rocket,
          },
          {
            to: '/banc',
            label: 'Banc d’essai',
            text: 'Ton app testée sur de vrais téléphones',
            icon: Smartphone,
          },
          {
            to: '/systalink',
            label: 'Héberger chez Systalink',
            text: 'En production en Afrique, à Dakar',
            icon: ServerCog,
          },
        ],
      },
    ],
  },
  {
    label: 'À propos',
    groups: [
      {
        title: 'DevHub',
        links: [
          {
            to: '/regles',
            label: 'Règles et Proof XP',
            text: 'Comment se gagnent les points',
            icon: Trophy,
          },
          {
            to: '/impact',
            label: 'Impact',
            text: 'Les chiffres réels de la plateforme',
            icon: BarChart3,
          },
          {
            to: '/confidentialite',
            label: 'Confidentialité',
            text: 'Tes données et tes droits',
            icon: ShieldCheck,
          },
        ],
      },
    ],
  },
];

/** Menu déroulant : s'ouvre au survol (souris) ou au clic, se ferme avec Échap ou en cliquant ailleurs. */
function HeaderMenu({
  menu,
  open,
  onOpen,
  onClose,
}: {
  menu: (typeof MENUS)[number];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, onClose]);
  const hover = (fn: () => void, delay: number) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, delay);
  };
  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={hover(onOpen, 60)}
      onPointerLeave={hover(onClose, 160)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (open ? onClose() : onOpen())}
        className={cn(
          'inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-[15px] font-medium text-fg transition-colors hover:bg-surface-2',
          open && 'bg-surface-2',
        )}
      >
        {menu.label}
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="dh-pop absolute top-full left-0 z-50 pt-2">
          <div className="flex gap-6 rounded-[18px] bg-canvas p-5 text-fg shadow-[0_24px_60px_rgba(0,0,0,0.18)] ring-1 ring-line">
            {menu.groups.map((g) => (
              <div key={g.title} className="w-[260px]">
                <p className="px-2 pb-2 text-[13px] font-semibold text-muted">{g.title}</p>
                <ul className="flex flex-col">
                  {g.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        onClick={onClose}
                        className="group flex items-start gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-surface-2"
                      >
                        {l.icon && <l.icon className="mt-0.5 size-5 shrink-0 text-fg" />}
                        <span>
                          <span className="block text-[14px] font-semibold">{l.label}</span>
                          {l.text && <span className="block text-[13px] text-muted">{l.text}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Récap hebdomadaire (Y3) : envoyé aux membres, donc l'abonnement passe par l'inscription. */
function Newsletter() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    nav(`/inscription?email=${encodeURIComponent(email.trim())}`);
  };
  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-2">
      <p className="text-[15px] font-semibold text-white">La lettre des devs</p>
      <p className="text-[14px] text-white/75">
        Le meilleur de la semaine pour les membres : actu, offres, nouvelles certifications. Une
        fois par semaine, sans spam.
      </p>
      <div className="mt-2 flex gap-2">
        <label htmlFor="nl-email" className="sr-only">
          Adresse e-mail
        </label>
        <input
          id="nl-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          className="h-10 min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-3 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-white/60"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-full bg-white px-4 text-[14px] font-semibold text-[#1e1f22] hover:bg-white/90 disabled:opacity-60"
        >
          S’abonner
        </button>
      </div>
    </form>
  );
}

const FOOTER: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Réseau',
    links: [
      { to: '/connexion?next=%2F', label: 'Fil d’actualité' },
      { to: '/emplois', label: 'Emplois' },
      { to: '/decouvrir', label: 'Développeurs' },
      { to: '/projets', label: 'Projets' },
    ],
  },
  {
    title: 'Progresser',
    links: [
      { to: '/certifications', label: 'Certifications' },
      { to: '/skills', label: 'Outils IA' },
      { to: '/sources', label: 'Sources' },
    ],
  },
  {
    title: 'Livrer',
    links: [
      { to: '/prevol', label: 'Pré-vol' },
      { to: '/banc', label: 'Banc d’essai' },
      { to: '/systalink', label: 'Systalink' },
    ],
  },
  {
    title: 'DevHub',
    links: [
      { to: '/regles', label: 'Règles et XP' },
      { to: '/impact', label: 'Impact' },
      { to: '/confidentialite', label: 'Confidentialité' },
      { to: '/inscription', label: 'Créer un compte' },
    ],
  },
];

/** Shell des visiteurs sans compte (T1) : en-tête en verre clair comme l'application, pied de page aux tons Discord. */
export function PublicShell() {
  const { t } = useTranslation();
  const lang = useLang();
  const { theme, setTheme, setPalette } = useUI();
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState<number | null>(null);
  const { pathname } = useLocation();
  useEffect(() => setMenu(null), [pathname]);
  const close = () => setMenu(null);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="dh-glassbar sticky top-0 z-30 text-fg">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2 px-4 sm:px-6">
          <Link to="/" aria-label={t('app.name')} className="mr-3">
            <Logo />
          </Link>
          <nav className="hidden items-center lg:flex" aria-label={t('nav.menu')}>
            {MENUS.map((m, i) => (
              <HeaderMenu
                key={m.label}
                menu={m}
                open={menu === i}
                onOpen={() => setMenu(i)}
                onClose={close}
              />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="lg-clear hidden h-9 w-[220px] items-center gap-2 rounded-full px-4 text-left text-[14px] text-muted md:flex"
            >
              <Search className="size-4" />
              <span className="flex-1">Rechercher</span>
              <kbd className="rounded border border-line-strong px-1.5 text-[11px]">/</kbd>
            </button>
            <button
              type="button"
              aria-label={t('nav.theme')}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden size-9 place-items-center rounded-full text-fg hover:bg-surface-2 sm:grid"
            >
              {theme === 'dark' ? (
                <Sun className="size-[18px]" />
              ) : (
                <Moon className="size-[18px]" />
              )}
            </button>
            <Link
              to="/connexion"
              className="hidden h-9 items-center rounded-full px-3.5 text-[15px] font-medium hover:bg-surface-2 sm:inline-flex"
            >
              Se connecter
            </Link>
            <Link
              to="/inscription"
              className="lg-tint inline-flex h-9 items-center rounded-full px-4 text-[15px] font-semibold"
            >
              S’inscrire
            </Link>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full hover:bg-surface-2 lg:hidden"
              aria-label={t('nav.menu')}
              onClick={() => setSheet(true)}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
        <OfflineBanner />
      </header>

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-[1280px] empty:hidden">
          <AnnouncementBar />
        </div>
        <Outlet />
      </main>

      <footer className="bg-[#1e1f22] text-white/80">
        <div className="mx-auto max-w-[1280px] px-4 pt-16 pb-10 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[1.3fr_2fr]">
            <div className="flex flex-col gap-8">
              <Logo onDark />
              <Newsletter />
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {FOOTER.map((c) => (
                <div key={c.title}>
                  <p className="text-[14px] font-semibold text-white">{c.title}</p>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {c.links.map((l) => (
                      <li key={l.to}>
                        <Link to={l.to} className="text-[14px] hover:text-white">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-[13px] sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} DevHub · {t('app.madeIn')}
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setLanguage(lang === 'fr' ? 'en' : 'fr')}
                className="hover:text-white"
              >
                {lang === 'fr' ? 'English' : 'Français'}
              </button>
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hover:text-white"
              >
                {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
              </button>
            </div>
          </div>
        </div>
      </footer>

      <Sheet open={sheet} onOpenChange={setSheet} title={t('nav.menu')} size="sm">
        <nav className="flex flex-col gap-5">
          {MENUS.map((m) => (
            <div key={m.label}>
              <p className="label-caps px-3 pb-1">{m.label}</p>
              {m.groups
                .flatMap((g) => g.links)
                .map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setSheet(false)}
                    className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium text-fg hover:bg-surface-1"
                  >
                    {l.icon && <l.icon className="size-[18px] text-fg" />}
                    {l.label}
                  </Link>
                ))}
            </div>
          ))}
          <div className="flex gap-2">
            <Link
              to="/connexion"
              onClick={() => setSheet(false)}
              className="lg-clear flex h-11 flex-1 items-center justify-center rounded-full text-[15px] font-semibold text-fg"
            >
              Se connecter
            </Link>
            <Link
              to="/inscription"
              onClick={() => setSheet(false)}
              className="lg-tint flex h-11 flex-1 items-center justify-center rounded-full text-[15px] font-semibold"
            >
              S’inscrire
            </Link>
          </div>
        </nav>
      </Sheet>
    </div>
  );
}
