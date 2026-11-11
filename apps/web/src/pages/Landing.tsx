import {
  AirplaneTakeoff,
  Briefcase,
  Certificate,
  ChatsCircle,
  Compass,
  DeviceMobile,
  Newspaper,
  PuzzlePiece,
  SealCheck,
} from '@phosphor-icons/react';
import { ArrowRight, ArrowUpRight, Check, CircleCheck, CircleHelp } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import shotCerts from '@/assets/product/certs.webp';
import shotFeed from '@/assets/product/feed.webp';
import shotPrevol from '@/assets/product/prevol.webp';
import { Djeli } from '@/components/djeli';
import { MobileAppsSection } from '@/components/landing/MobileApps';
import { errorText } from '@/components/domain';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { countryName } from '@/lib/geo';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { BrandLogo as TechLogo } from '@/platform/logos';
import { Ago } from '@/platform/ui';
import { api } from '@/services';
import type { PublicLanding } from '@/services/types';
import { useSession, useUI } from '@/stores/app';
import { VerifyForm } from './CertVerify';

/* ==================================================================
   Site vitrine (v3) : même langage que l'application — Poppins, tons neutres façon Discord,
   verre discret, grands éléments. De vraies captures de DevHub, des chiffres tirés de la base,
   aucun contenu inventé.
   ================================================================== */

function SignUpInline({ id, className }: { id: string; className?: string }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    nav(`/inscription${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`);
  };
  return (
    <form
      onSubmit={submit}
      className={cn('flex w-full max-w-[520px] flex-col gap-2 sm:flex-row', className)}
    >
      <label htmlFor={id} className="sr-only">
        Adresse e-mail
      </label>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Ton adresse e-mail"
        className="lg-clear h-12 w-full min-w-0 shrink-0 rounded-full px-5 text-[15px] text-fg outline-none sm:w-auto sm:flex-1 placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
      />
      <button
        type="submit"
        className="lg-tint lp-press h-12 shrink-0 rounded-full px-6 text-[15px] font-semibold"
      >
        Rejoindre DevHub
      </button>
    </form>
  );
}

function useTryDemo() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setUser = useSession((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const u = await api.loginDemo('awa-kone');
      setUser(u);
      invalidate('');
      nav('/');
    } catch (e) {
      toast.error(errorText(t, e));
      setBusy(false);
    }
  };
  return { run, busy };
}

/** Capture réelle de l'application dans un cadre de fenêtre minimal. */
function Screen({ src, alt, eager }: { src: string; alt: string; eager?: boolean }) {
  return (
    <div className="lp-fade overflow-hidden rounded-[18px] bg-white ring-1 ring-black/10 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.35)]">
      <div className="flex h-9 items-center gap-1.5 border-b border-black/5 bg-[#f2f3f5] px-4">
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
      </div>
      <img
        src={src}
        alt={alt}
        width={1440}
        height={900}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
}

const TABS = [
  {
    id: 'fil',
    label: 'Fil d’actualité',
    text: 'L’actu tech et IA de plus de 70 sources vérifiées, les questions d’entraide et les projets de la communauté, filtrés par tes centres d’intérêt.',
    src: shotFeed,
  },
  {
    id: 'prevol',
    label: 'Pré-vol',
    text: 'Avant de lancer : secrets exposés, chargement en 3G, failles des dépendances, licences, Lighthouse et tenue à la charge. Le rapport se colle dans ton agent IA, qui corrige.',
    src: shotPrevol,
  },
  {
    id: 'certs',
    label: 'Certifications',
    text: 'Programme par thème, entraînement corrigé, examen blanc, puis un examen corrigé par le serveur et un code que n’importe quel recruteur peut vérifier.',
    src: shotCerts,
  },
] as const;

type Icon = ComponentType<{ className?: string; weight?: 'fill' }>;

const PILLARS: {
  title: string;
  text: string;
  links: { to: string; label: string; icon: Icon }[];
}[] = [
  {
    title: 'Le réseau',
    text: 'Suis l’actu qui compte, pose ta question quand tu bloques, trouve une mission ou les devs qu’il te faut.',
    links: [
      { to: '/connexion?next=%2F', label: 'Fil d’actualité', icon: Newspaper },
      { to: '/connexion?next=%2F%3Ff%3Dquestions', label: 'Entraide', icon: ChatsCircle },
      { to: '/emplois', label: 'Emplois et missions', icon: Briefcase },
      { to: '/decouvrir', label: 'Développeurs', icon: Compass },
    ],
  },
  {
    title: 'Progresser',
    text: 'Prépare et passe des certifications gratuites, équipe ton agent de code avec les bons outils.',
    links: [
      { to: '/certifications', label: 'Certifications vérifiables', icon: Certificate },
      { to: '/skills', label: 'Skills, plugins et serveurs MCP', icon: PuzzlePiece },
    ],
  },
  {
    title: 'Livrer',
    text: 'Vérifie que ton app tient en vrai avant de la lancer, puis fais-la tester sur de vrais téléphones.',
    links: [
      { to: '/prevol', label: 'Pré-vol', icon: AirplaneTakeoff },
      { to: '/banc', label: 'Banc d’essai', icon: DeviceMobile },
    ],
  },
];

const ECOSYSTEM = [
  'GitHub',
  'GitLab',
  'Google',
  'Claude',
  'Cursor',
  'Docker',
  'React',
  'Flutter',
  'Python',
  'Kubernetes',
  'PostgreSQL',
  'Firebase',
  'Gemini',
  'Node.js',
];

const SHIP_STEPS = [
  {
    n: '1',
    title: 'Ton IA écrit le code',
    text: 'Claude Code, Codex, Cursor : tu avances vite. Mais ce qui marche chez toi n’est pas encore prouvé.',
  },
  {
    n: '2',
    title: 'Pré-vol',
    text: 'Secrets exposés, premier affichage en 3G, failles connues, Lighthouse mobile, montée en charge, avec les fichiers de correction prêts. Verdict GO : ton app reçoit le label DevHub Ready.',
    to: '/prevol',
  },
  {
    n: '3',
    title: 'Banc d’essai',
    text: 'D’autres devs ouvrent ton app sur leur Android d’entrée de gamme, en 3G ou hors ligne, et rendent un rapport. Chaque rapport confirmé leur rapporte des Proof XP.',
    to: '/banc',
  },
  {
    n: '4',
    title: 'En ligne, en Afrique',
    text: 'Héberge chez Systalink, l’hébergeur africain : ta salle de projet affiche la preuve que l’app tourne en production.',
    to: '/systalink',
  },
];

/**
 * La page d'accueil publique est toujours sombre (choix de Sylvio, 10/11/2026) : le thème choisi
 * par le visiteur s'applique de nouveau dès qu'il quitte la page.
 */
function useDarkOnly() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const force = () => {
      root.dataset.theme = 'dark';
      meta?.setAttribute('content', '#0B0B0C');
    };
    force();
    // Un changement de thème fait ailleurs (Ctrl+K, raccourci) ne touche pas cette page.
    const unsubscribe = useUI.subscribe(force);
    return () => {
      unsubscribe();
      const theme = useUI.getState().theme;
      root.dataset.theme = theme;
      meta?.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#0B0B0C');
    };
  }, []);
}

const PILLAR_ICONS: { icon: Icon; tone: string }[] = [
  { icon: ChatsCircle, tone: 'bg-[#3b82f6]/15 text-[#7fb0ff]' },
  { icon: Certificate, tone: 'bg-[#f59e0b]/15 text-[#fbbf5a]' },
  { icon: AirplaneTakeoff, tone: 'bg-[#14b8a6]/15 text-[#4fd1c5]' },
];

/**
 * Les trois piliers. Sur mobile, un carrousel qu'on fait glisser (cartes à 84 % de la largeur,
 * la suivante dépasse) avec un indicateur ; à partir de 768 px, trois colonnes.
 */
function PillarCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    setActive(Math.round(el.scrollLeft / (card.offsetWidth + 12)));
  };
  const go = (i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 16, behavior: 'smooth' });
  };
  return (
    <>
      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0"
      >
        {PILLARS.map((p, i) => {
          const head = PILLAR_ICONS[i]!;
          return (
            <div
              key={p.title}
              className="surface-card flex w-[84%] shrink-0 snap-start flex-col p-6 md:w-auto"
            >
              <span className={cn('grid size-11 place-items-center rounded-[14px]', head.tone)}>
                <head.icon weight="fill" className="size-6" />
              </span>
              <h3 className="mt-4 text-[22px] font-bold tracking-[-0.02em] text-fg">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-fg/80">{p.text}</p>
              <ul className="mt-5 flex flex-col gap-1">
                {p.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="group flex items-center gap-3 rounded-[12px] px-2 py-2.5 text-[15px] font-semibold text-fg transition-colors hover:bg-surface-2"
                    >
                      <l.icon weight="fill" className="size-5 shrink-0" />
                      <span className="flex-1">{l.label}</span>
                      <ArrowUpRight className="size-4 opacity-60 transition-opacity group-hover:opacity-100 md:opacity-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {/* Zone cliquable de 24 × 24 px au moins (A11Y-04, WCAG 2.5.8) ; le point visible reste fin. */}
      <div className="mt-4 flex items-center justify-center md:hidden">
        {PILLARS.map((p, i) => (
          <button
            key={p.title}
            type="button"
            aria-label={`Voir ${p.title}`}
            aria-current={i === active || undefined}
            onClick={() => go(i)}
            className="grid h-6 min-w-6 place-items-center px-1"
          >
            <span
              aria-hidden
              className={cn(
                'block h-2 rounded-full transition-all duration-200',
                i === active ? 'w-6 bg-fg' : 'w-2 bg-fg/30',
              )}
            />
          </button>
        ))}
      </div>
    </>
  );
}

export default function Landing() {
  useDarkOnly();
  const { run: tryDemo, busy } = useTryDemo();
  const [tab, setTab] = useState(0);
  const current = TABS[tab]!;
  const bank = PLATFORM_CERTS.reduce((n, c) => n + c.bankSize, 0);

  return (
    <div className="bg-canvas">
      {/* ---------- Héros ---------- */}
      <section className="mx-auto max-w-[1180px] px-4 pt-14 text-center sm:px-6 sm:pt-20">
        <p className="lg-clear mx-auto inline-flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-medium text-fg">
          <SealCheck weight="fill" className="size-4 text-accent-text" />
          Par les devs, pour les devs
        </p>
        <h1 className="mx-auto mt-6 max-w-[920px] text-[42px] leading-[1.02] font-bold tracking-[-0.035em] text-fg sm:text-[68px]">
          La plateforme d’échange des devs africains.
        </h1>
        <p className="mx-auto mt-5 max-w-[680px] text-[17px] leading-relaxed text-fg/80 sm:text-[19px]">
          On s’entraide quand on bloque, on partage l’actu, ses projets et les offres d’emploi, et
          on prouve ce qu’on sait faire : certifications vérifiables, pré-vol et banc d’essai pour
          livrer des apps qui tiennent.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <SignUpInline id="hero-email" />
          <p className="text-[14px] text-fg/75">
            Gratuit. Avec ton compte GitHub ou ton e-mail.{' '}
            <Link to="/connexion" className="font-semibold text-fg hover:underline">
              Se connecter
            </Link>
          </p>
          {/* Les comptes de démonstration n'existent qu'avec le serveur simulé (ADR-0016). */}
          {api.mode === 'local' && (
            <button
              type="button"
              onClick={tryDemo}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-fg disabled:opacity-60"
            >
              {busy ? 'Ouverture…' : 'Visiter sans compte'}
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Aperçu de DevHub"
          className="no-scrollbar mx-auto mt-14 flex max-w-full gap-2 overflow-x-auto sm:justify-center"
        >
          {TABS.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={i === tab}
              aria-controls="lp-shot"
              onClick={() => setTab(i)}
              className={cn(
                'lp-press h-10 shrink-0 rounded-full px-5 text-[14px] font-semibold transition-colors duration-150',
                i === tab ? 'lg-tint' : 'lg-clear text-fg',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p key={current.id} className="lp-fade mx-auto mt-4 max-w-[640px] text-[15px] text-fg/80">
          {current.text}
        </p>
        <div id="lp-shot" role="tabpanel" className="mx-auto mt-8 max-w-[1120px]">
          <Screen
            key={current.id}
            src={current.src}
            alt={`Capture de DevHub : ${current.label}`}
            eager
          />
        </div>
      </section>

      {/* ---------- Logos ---------- */}
      <section aria-label="Écosystème" className="mx-auto max-w-[1280px] px-4 pt-16 pb-10 sm:px-6">
        <p className="text-center text-[14px] font-medium text-fg/75">
          Branché sur les outils que tu utilises déjà
        </p>
        <div className="lp-marquee mt-6 overflow-hidden">
          <ul className="lp-marquee-track flex w-max items-center gap-14 pr-14">
            {[...ECOSYSTEM, ...ECOSYSTEM].map((n, i) => (
              <li
                key={`${n}-${i}`}
                aria-hidden={i >= ECOSYSTEM.length || undefined}
                className="inline-flex shrink-0 items-center gap-2.5 text-[18px] font-semibold text-fg"
              >
                <TechLogo name={n} size={28} />
                {n}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Trois piliers, comme le menu de l'application ---------- */}
      <section className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6">
        <h2 className="max-w-[760px] text-[34px] leading-[1.06] font-bold tracking-[-0.03em] text-fg sm:text-[48px]">
          Tout ce qu’il faut pour avancer, sans changer d’onglet.
        </h2>
        <PillarCarousel />
      </section>

      {/* ---------- Du prompt à la prod vérifiée ---------- */}
      <section className="bg-[#1e1f22] py-20 text-white">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
          <p className="text-[14px] font-semibold text-[#8ab4ff]">Du prompt à la prod vérifiée</p>
          <h2 className="mt-2 max-w-[760px] text-[34px] leading-[1.06] font-bold tracking-[-0.03em] sm:text-[48px]">
            Ton IA a écrit le code. DevHub vérifie qu’il tient.
          </h2>
          {/* Mobile : frise reliée ; à partir de 640 px : cartes en grille. */}
          <ol className="mt-10 flex flex-col gap-7 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {SHIP_STEPS.map((s, i) => (
              <li
                key={s.n}
                className="relative flex gap-4 sm:flex-col sm:gap-0 sm:rounded-[18px] sm:bg-white/[0.06] sm:p-5"
              >
                {i < SHIP_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-10 -bottom-7 left-[17px] w-0.5 rounded-full bg-gradient-to-b from-[#8ab4ff]/70 to-white/10 sm:hidden"
                  />
                )}
                <span className="relative z-[1] grid size-9 shrink-0 place-items-center rounded-full bg-white text-[15px] font-bold text-[#1e1f22] ring-4 ring-[#1e1f22] sm:ring-0">
                  {s.n}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="mt-1.5 text-[18px] font-semibold sm:mt-4">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/80">{s.text}</p>
                  {s.to && (
                    <Link
                      to={s.to}
                      className="mt-auto inline-flex items-center gap-1 pt-4 text-[14px] font-semibold text-white hover:underline sm:pt-5"
                    >
                      Découvrir
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Certifications vérifiables ---------- */}
      <section className="mx-auto grid max-w-[1120px] items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-[14px] font-semibold text-accent-text">Certifications</p>
          <h2 className="mt-2 text-[34px] leading-[1.06] font-bold tracking-[-0.03em] text-fg sm:text-[48px]">
            Des badges qu’un recruteur peut vérifier.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-fg/80">
            Les questions sont tirées et corrigées par le serveur, chronométrées, et chaque
            certificat a un code public. Pour s’y préparer : programme par thème, entraînement
            corrigé, examen blanc et plan de révision jusqu’à ta date d’examen.
          </p>
          <dl className="mt-8 grid grid-cols-3 border-t border-line-strong">
            {[
              [PLATFORM_CERTS.length, 'certifications DevHub'],
              [bank, 'questions corrigées'],
              ['0 F', 'pour les passer'],
            ].map(([n, l]) => (
              <div key={l} className="pt-5 pr-4">
                <dt className="text-[34px] leading-none font-bold tracking-[-0.03em] text-fg tabular-nums">
                  {n}
                </dt>
                <dd className="mt-2 text-[14px] text-fg/75">{l}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/certifications"
            className="lg-tint lp-press mt-8 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold"
          >
            Voir les certifications
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="surface-card p-6 sm:p-8">
          <p className="text-[18px] font-semibold text-fg">Vérifier un certificat</p>
          <p className="mt-1 text-[15px] text-fg/80">
            Un candidat t’a donné un code DevHub ? Colle-le ici : tu vois qui l’a obtenu, quand et
            avec quel score.
          </p>
          <VerifyForm className="mt-5 flex gap-2" />
          <ul className="mt-6 grid grid-cols-3 gap-3">
            {PLATFORM_CERTS.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  to={`/certifications/${c.id}`}
                  className="flex h-full flex-col items-center gap-2 rounded-[14px] bg-surface-2 p-3 text-center text-[12px] font-semibold text-fg hover:bg-surface-3"
                >
                  <TechLogo name={c.logo ?? c.track} size={26} />
                  <span className="line-clamp-2">{c.title.split(' — ')[0]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MobileAppsSection />

      <StatsSection />

      {/* ---------- Appel final ---------- */}
      <section className="px-4 pt-6 pb-24 sm:px-6">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center rounded-[28px] bg-[#1e1f22] px-6 py-16 text-center text-white sm:py-20">
          <Djeli pose="celebrate" size={104} />
          <h2 className="mt-5 max-w-[680px] text-[34px] leading-[1.06] font-bold tracking-[-0.03em] sm:text-[48px]">
            Ta place est déjà prête.
          </h2>
          <p className="mt-4 max-w-[480px] text-[17px] text-white/80">
            Ta première ligne de code ou ta millième PR : rejoins les devs qui construisent.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/inscription"
              className="lp-press inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-semibold text-[#1e1f22]"
            >
              Créer mon compte
            </Link>
            <Link
              to="/connexion"
              className="inline-flex h-12 items-center rounded-full px-6 text-[15px] font-semibold text-white ring-1 ring-white/30 hover:ring-white"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const STATS_REFRESH_MS = 60_000;

/**
 * Ce qui existe vraiment sur DevHub, sans compte : compteurs de l'écran d'impact, dernières
 * questions (anonymes) et profils. Rien n'est inventé : sans données, la page le dit.
 */
function StatsSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';
  const { data, error, refresh } = useQuery<PublicLanding>('landing:live', () => api.getLanding());

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh().catch(() => {});
    }, STATS_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const stats = [
    { label: t('pub.liveDevs'), value: data?.stats.devs },
    { label: t('pub.liveResolved'), value: data?.stats.questionsResolved },
    { label: t('pub.liveCountries'), value: data?.stats.countries },
  ];

  return (
    <section aria-labelledby="stats-title" className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6">
      <h2 id="stats-title" className="text-[24px] font-bold tracking-[-0.02em] text-fg">
        {t('pub.liveTitle')}
      </h2>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="surface-card px-4 py-4 sm:px-6">
            <dt className="text-[14px] text-fg/75">{s.label}</dt>
            <dd className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-fg tabular-nums sm:text-[32px]">
              {s.value === undefined ? error ? '—' : <Skeleton className="h-8 w-14" /> : s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface-card p-5">
          <h3 className="text-[16px] font-semibold text-fg">{t('pub.liveFeed')}</h3>
          {!data && !error ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !data?.live.length ? (
            <p className="mt-3 text-[15px] leading-relaxed text-fg/80">
              {error ? t('pub.liveUnavailable') : t('pub.liveEmpty')}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.live.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  {a.kind === 'resolved' ? (
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-fg/75">
                      {a.kind === 'resolved'
                        ? t('pub.liveResolvedIn', { count: Number(a.detail) || 1 })
                        : t('pub.liveAsked')}
                      {' · '}
                      <Ago iso={a.createdAt} />
                    </p>
                    <Link
                      to={a.targetHref}
                      className="line-clamp-1 text-[15px] font-medium text-fg hover:underline"
                    >
                      {a.targetLabel}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card p-5">
          <h3 className="text-[16px] font-semibold text-fg">{t('pub.liveFeatured')}</h3>
          {data && !data.featured.length ? (
            <p className="mt-3 text-[15px] leading-relaxed text-fg/80">{t('pub.liveNoDevs')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(data?.featured ?? []).map((d) => (
                <li key={d.handle}>
                  <Link
                    to={`/u/${d.handle}`}
                    className="flex items-center gap-3 rounded-[10px] p-2 hover:bg-surface-2"
                  >
                    <Avatar name={d.displayName} src={d.avatarUrl ?? undefined} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-fg">
                        {d.displayName}
                      </span>
                      <span className="block truncate text-[13px] text-fg/75">
                        {[countryName(d.country, lang), `${d.totalXp} Proof XP`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[13px] text-fg/75">
        <Check className="size-3.5" />
        Chiffres lus en direct dans la base de DevHub, rien n’est arrondi ni inventé.
      </p>
    </section>
  );
}
