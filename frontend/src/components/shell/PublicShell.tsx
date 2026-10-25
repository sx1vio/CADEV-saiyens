import {
  Award,
  BookOpenCheck,
  Briefcase,
  ChevronDown,
  Compass,
  FolderGit2,
  GraduationCap,
  LayoutTemplate,
  LifeBuoy,
  Menu,
  Moon,
  Newspaper,
  PlaySquare,
  Puzzle,
  Search,
  ServerCog,
  Sun,
  Trophy,
  Users,
  Wand2,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router'
import { toast } from 'sonner'
import { setLanguage, useLang } from '@/i18n'
import { cn } from '@/lib/utils'
import { useUI } from '@/stores/app'
import { Sheet } from '../ui/overlay'
import { OfflineBanner } from './network'
import { BrandLogo } from '../brand'

export function Logo({ className, onDark }: { className?: string; onDark?: boolean }) {
  return <BrandLogo size={34} onDark={onDark} className={className} />
}

interface MenuLink {
  to: string
  label: string
  text?: string
  icon?: LucideIcon
}

/** Menus de l'en-tête, organisés comme ceux de GitHub : une colonne mise en avant, des groupes de liens. */
const MENUS: { label: string; groups: { title: string; links: MenuLink[] }[] }[] = [
  {
    label: 'Plateforme',
    groups: [
      {
        title: 'Apprendre et progresser',
        links: [
          { to: '/apprendre', label: 'Apprendre', text: 'Parcours gratuits, quiz et séries', icon: GraduationCap },
          { to: '/certifications', label: 'Certifications', text: 'Examens gratuits et guide du marché', icon: Award },
          { to: '/creer', label: 'Créer avec l’IA', text: 'De l’idée à l’app en ligne', icon: Wand2 },
        ],
      },
      {
        title: 'S’entraider',
        links: [
          { to: '/sos', label: 'Entraide', text: 'Une piste tout de suite, un dev ensuite', icon: LifeBuoy },
          { to: '/communautes', label: 'Communautés', text: 'Des espaces par sujet', icon: Users },
          { to: '/projets', label: 'Projets', text: 'Trouver ou rejoindre une équipe', icon: FolderGit2 },
        ],
      },
    ],
  },
  {
    label: 'Carrière',
    groups: [
      {
        title: 'Se faire connaître',
        links: [
          { to: '/emplois', label: 'Emplois et missions', text: 'Des offres qui lisent tes preuves', icon: Briefcase },
          { to: '/decouvrir', label: 'Trouver des devs', text: 'Par compétence, pays, disponibilité', icon: Compass },
          { to: '/classement', label: 'Classement', text: 'Les devs et pays les plus utiles', icon: Trophy },
        ],
      },
    ],
  },
  {
    label: 'Ressources',
    groups: [
      {
        title: 'Se tenir à jour',
        links: [
          { to: '/', label: 'Actualités', text: 'IA, web, mobile, cloud, Afrique', icon: Newspaper },
          { to: '/videos', label: 'Vidéos', text: 'Les chaînes tech qui comptent', icon: PlaySquare },
          { to: '/sources', label: 'Nos sources', text: 'D’où vient chaque article', icon: BookOpenCheck },
        ],
      },
      {
        title: 'Outils',
        links: [
          { to: '/skills', label: 'Skills et plugins IA', text: 'Pour Claude Code, Codex, Cursor', icon: Puzzle },
          { to: '/templates', label: 'Templates', text: 'Des modèles prêts à adapter', icon: LayoutTemplate },
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
          { to: '/regles', label: 'Règles et XP', text: 'Comment se gagne la réputation', icon: BookOpenCheck },
          { to: '/impact', label: 'Impact', text: 'Ce que la plateforme change, en chiffres', icon: BarChart3 },
          { to: '/systalink', label: 'Systalink', text: 'Notre hébergeur, en Afrique', icon: ServerCog },
        ],
      },
    ],
  },
]

/** Menu déroulant : s'ouvre au survol (souris) ou au clic, se ferme avec Échap ou en cliquant ailleurs. */
function HeaderMenu({ menu, open, onOpen, onClose }: { menu: (typeof MENUS)[number]; open: boolean; onOpen: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, onClose])
  const hover = (fn: () => void, delay: number) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(fn, delay)
  }
  return (
    <div ref={ref} className="relative" onPointerEnter={hover(onOpen, 60)} onPointerLeave={hover(onClose, 160)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (open ? onClose() : onOpen())}
        className={cn('inline-flex h-9 items-center gap-1 rounded-[8px] px-3 text-[15px] font-medium text-white transition-colors hover:text-white/80', open && 'text-white/80')}
      >
        {menu.label}
        <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="dh-pop absolute top-full left-0 z-50 pt-2">
          <div className="flex gap-6 rounded-[16px] bg-white p-5 text-[#0b1530] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            {menu.groups.map((g) => (
              <div key={g.title} className="w-[260px]">
                <p className="px-2 pb-2 text-[12px] font-medium text-[#6b7280]">{g.title}</p>
                <ul className="flex flex-col">
                  {g.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} onClick={onClose} className="group flex items-start gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-[#f1f5ff]">
                        {l.icon && <l.icon className="mt-0.5 size-5 shrink-0 text-[#6b7280] group-hover:text-[#1d4ed8]" />}
                        <span>
                          <span className="block text-[14px] font-semibold group-hover:text-[#1d4ed8]">{l.label}</span>
                          {l.text && <span className="block text-[12.5px] text-[#6b7280]">{l.text}</span>}
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
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      if (!r.ok) throw new Error()
      toast.success('C’est noté : tu recevras la lettre des devs.')
      setEmail('')
    } catch {
      toast.error('Adresse invalide ou serveur indisponible. Réessaie.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-2">
      <p className="text-[15px] font-semibold text-white">La lettre des devs</p>
      <p className="text-[13.5px] text-white/60">Le meilleur de la semaine : actu, nouveaux cours, offres. Une fois par semaine, sans spam.</p>
      <div className="mt-2 flex gap-2">
        <label htmlFor="nl-email" className="sr-only">
          Adresse e-mail
        </label>
        <input id="nl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" className="h-10 min-w-0 flex-1 rounded-[10px] border border-white/15 bg-white/5 px-3 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-[#5eead4]" />
        <button type="submit" disabled={busy} className="h-10 shrink-0 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#0b1530] hover:bg-white/90 disabled:opacity-60">
          S’abonner
        </button>
      </div>
    </form>
  )
}

const FOOTER: { title: string; links: { to: string; label: string }[] }[] = [
  { title: 'Plateforme', links: [{ to: '/apprendre', label: 'Apprendre' }, { to: '/sos', label: 'Entraide' }, { to: '/communautes', label: 'Communautés' }, { to: '/projets', label: 'Projets' }, { to: '/creer', label: 'Créer avec l’IA' }] },
  { title: 'Carrière', links: [{ to: '/emplois', label: 'Emplois' }, { to: '/certifications', label: 'Certifications' }, { to: '/decouvrir', label: 'Trouver des devs' }, { to: '/classement', label: 'Classement' }] },
  { title: 'Ressources', links: [{ to: '/videos', label: 'Vidéos' }, { to: '/sources', label: 'Sources' }, { to: '/skills', label: 'Skills IA' }, { to: '/templates', label: 'Templates' }] },
  { title: 'DevHub', links: [{ to: '/regles', label: 'Règles et XP' }, { to: '/impact', label: 'Impact' }, { to: '/systalink', label: 'Systalink' }, { to: '/inscription', label: 'Créer un compte' }] },
]

/** Shell des visiteurs sans compte (T1) : en-tête et pied de page façon GitHub, sur bleu nuit. */
export function PublicShell() {
  const { t } = useTranslation()
  const lang = useLang()
  const { theme, setTheme, setPalette } = useUI()
  const [sheet, setSheet] = useState(false)
  const [menu, setMenu] = useState<number | null>(null)
  const { pathname } = useLocation()
  useEffect(() => setMenu(null), [pathname])
  const close = () => setMenu(null)

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-30 bg-[#0a0f1f] text-white">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2 px-4 sm:px-6">
          <Link to="/" aria-label={t('app.name')} className="mr-3">
            <Logo onDark />
          </Link>
          <nav className="hidden items-center lg:flex" aria-label={t('nav.menu')}>
            {MENUS.map((m, i) => (
              <HeaderMenu key={m.label} menu={m} open={menu === i} onOpen={() => setMenu(i)} onClose={close} />
            ))}
            <Link to="/apprendre" className="inline-flex h-9 items-center rounded-[8px] px-3 text-[15px] font-medium hover:text-white/80">
              Cours gratuits
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setPalette(true)} className="hidden h-9 w-[220px] items-center gap-2 rounded-[8px] border border-white/20 px-3 text-left text-[13.5px] text-white/60 transition-colors hover:border-white/40 md:flex">
              <Search className="size-4" />
              <span className="flex-1">Rechercher</span>
              <kbd className="rounded border border-white/20 px-1.5 text-[11px]">/</kbd>
            </button>
            <button type="button" aria-label={t('nav.theme')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="hidden size-9 place-items-center rounded-[8px] text-white/80 hover:text-white sm:grid">
              {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
            <Link to="/connexion" className="hidden h-9 items-center rounded-[8px] px-3 text-[15px] font-medium hover:text-white/80 sm:inline-flex">
              Se connecter
            </Link>
            <Link to="/inscription" className="inline-flex h-9 items-center rounded-[8px] border border-white/40 px-3 text-[15px] font-medium transition-colors hover:border-white">
              S’inscrire
            </Link>
            <button type="button" className="grid size-9 place-items-center rounded-[8px] lg:hidden" aria-label={t('nav.menu')} onClick={() => setSheet(true)}>
              <Menu className="size-5" />
            </button>
          </div>
        </div>
        <OfflineBanner />
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#0a0f1f] text-white/70">
        <div className="mx-auto max-w-[1280px] px-4 pt-16 pb-10 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
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
            <p>© {new Date().getFullYear()} DevHub · {t('app.madeIn')}</p>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setLanguage(lang === 'fr' ? 'en' : 'fr')} className="hover:text-white">
                {lang === 'fr' ? 'English' : 'Français'}
              </button>
              <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="hover:text-white">
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
              {m.groups.flatMap((g) => g.links).map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setSheet(false)} className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium text-fg hover:bg-surface-1">
                  {l.icon && <l.icon className="size-[18px] text-muted" />}
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex gap-2">
            <Link to="/connexion" onClick={() => setSheet(false)} className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-surface-1 text-[15px] font-semibold text-fg">
              Se connecter
            </Link>
            <Link to="/inscription" onClick={() => setSheet(false)} className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-accent text-[15px] font-semibold text-white">
              S’inscrire
            </Link>
          </div>
        </nav>
      </Sheet>
    </div>
  )
}
