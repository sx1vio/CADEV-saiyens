import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  CircleHelp,
  Flame,
  RotateCcw,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import shotFeed from '@/assets/product/feed.webp';
import shotLearn from '@/assets/product/learn.webp';
import shotPassport from '@/assets/product/passport.webp';
import { Djeli, type DjeliPose } from '@/components/djeli';
import { errorText } from '@/components/domain';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { countryName } from '@/lib/geo';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api } from '@/services';
import type { PublicLanding } from '@/services/types';
import { useSession } from '@/stores/app';
import { Ago } from '@/platform/ui';
import { BrandLogo as TechLogo } from '@/platform/logos';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { PATHS, lessonCount } from '@/platform/data/learn';
import type { QuizQuestion } from '@/platform/types';

/* ==================================================================
   Page d'accueil publique. Structure de la page d'accueil de GitHub
   (annonce, héros centré + e-mail, produit à onglets, logos, sections, appel final),
   mais sobre : de vraies captures de DevHub, la typographie comme seul effet,
   aucun halo ni dégradé décoratif. Chiffres tirés des données réelles.
   ================================================================== */

const LESSONS = PATHS.reduce((n, p) => n + lessonCount(p), 0);

function SignUpInline({
  id,
  className,
  tone = 'dark',
}: {
  id: string;
  className?: string;
  tone?: 'dark' | 'light';
}) {
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
        className={cn(
          'h-12 min-w-0 flex-1 rounded-[10px] px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-[#f2b33d]',
          tone === 'dark'
            ? 'bg-white text-[#0a0f1f] placeholder:text-[#6b7280]'
            : 'border border-line-strong bg-canvas text-fg placeholder:text-subtle',
        )}
      />
      <button
        type="submit"
        className="lp-press h-12 shrink-0 rounded-[10px] bg-[#1d4ed8] px-5 text-[15px] font-semibold text-white hover:bg-[#1e40af]"
      >
        S’inscrire sur DevHub
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
function Screen({
  src,
  alt,
  className,
  eager,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[14px] bg-white ring-1 ring-black/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={1600}
        height={1000}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
}

const TABS = [
  {
    id: 'feed',
    label: 'Accueil',
    src: shotFeed,
    text: 'L’actu tech du jour, tes questions en attente et ta progression, sur un seul écran.',
  },
  {
    id: 'learn',
    label: 'Apprendre',
    src: shotLearn,
    text: 'Des parcours gratuits, du premier HTML aux agents IA, qui mènent à une certification.',
  },
  {
    id: 'passport',
    label: 'Passport',
    src: shotPassport,
    text: 'Ton profil se remplit avec des preuves : dépôts, aide apportée, projets livrés.',
  },
];

const PROFILES: {
  pose: DjeliPose;
  who: string;
  title: string;
  points: string[];
  to: string;
  cta: string;
}[] = [
  {
    pose: 'book',
    who: 'Tu débutes',
    title: 'Apprends sans te perdre.',
    points: [
      'Un parcours choisi selon ton objectif',
      'Une leçon de 10 minutes par jour',
      'De l’aide quand tu bloques',
    ],
    to: '/apprendre',
    cta: 'Voir les parcours',
  },
  {
    pose: 'laptop',
    who: 'Tu es dev',
    title: 'Fais valoir ce que tu sais.',
    points: [
      'Un Passport avec des preuves',
      'Des projets à rejoindre',
      'Des offres qui lisent tes compétences',
    ],
    to: '/emplois',
    cta: 'Voir les offres',
  },
  {
    pose: 'point',
    who: 'Tu ne codes pas encore',
    title: 'Crée ton app avec l’IA.',
    points: [
      'Un guide adapté à ton projet',
      'Des templates prêts à adapter',
      'Des devs à qui demander',
    ],
    to: '/creer',
    cta: 'Ouvrir le guide',
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

/* ---------- Mini-leçon jouable : le vrai quiz du parcours web ---------- */

const DEMO_QUIZ: QuizQuestion[] = [
  ...(PATHS.flatMap((p) => p.modules.flatMap((m) => m.lessons)).find((l) => l.id === 'quiz-js')
    ?.quiz ?? []),
  {
    q: 'Quelle balise donne le titre principal d’une page ?',
    choices: ['<title>', '<h1>', '<header>'],
    answer: 1,
    explain:
      '<h1> est le titre visible de la page ; <title> s’affiche dans l’onglet du navigateur.',
  },
];

function QuizDemo() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);
  const q = DEMO_QUIZ[i];
  const right = picked !== null && picked === q.answer;
  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.answer) setXp((x) => x + 5);
  };
  const next = () => {
    if (i + 1 >= DEMO_QUIZ.length) return setDone(true);
    setI(i + 1);
    setPicked(null);
  };
  const restart = () => {
    setI(0);
    setPicked(null);
    setXp(0);
    setDone(false);
  };
  return (
    <div className="rounded-[24px] border border-line-strong bg-canvas p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div
            className="h-full rounded-full bg-teal transition-[width] duration-500 ease-out"
            style={{
              width: `${((done ? DEMO_QUIZ.length : i + (picked !== null ? 1 : 0)) / DEMO_QUIZ.length) * 100}%`,
            }}
          />
        </div>
        <span className="inline-flex items-center gap-1 text-[14px] font-bold text-gold-text tabular-nums">
          <Flame className="size-4" />
          {xp} XP
        </span>
      </div>

      {done ? (
        <div className="lp-fade flex flex-col items-center py-8 text-center">
          <Djeli pose="trophy" size={120} />
          <p className="mt-4 text-[22px] font-bold tracking-[-0.02em] text-fg">
            Leçon terminée, +{xp} XP
          </p>
          <p className="mt-1 max-w-[340px] text-[14.5px] text-muted">
            Crée ton compte pour garder ta série et continuer le parcours « Devenir développeur·se
            web ».
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              to="/inscription"
              className="lp-press inline-flex h-11 items-center gap-2 rounded-[10px] bg-accent px-5 text-[15px] font-semibold text-white"
            >
              Garder ma série
              <ArrowRight className="size-4" />
            </Link>
            <button
              type="button"
              onClick={restart}
              className="lp-press inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[14.5px] font-medium text-muted hover:text-fg"
            >
              <RotateCcw className="size-4" />
              Recommencer
            </button>
          </div>
        </div>
      ) : (
        <div key={i} className="lp-fade">
          <p className="mt-6 text-[12.5px] font-semibold text-subtle">
            Question {i + 1} sur {DEMO_QUIZ.length}
          </p>
          <p className="mt-1 text-[20px] leading-snug font-bold tracking-[-0.015em] text-fg">
            {q.q}
          </p>
          <div className="mt-5 flex flex-col gap-2.5" role="group" aria-label="Réponses">
            {q.choices.map((c, k) => {
              const state =
                picked === null
                  ? 'idle'
                  : k === q.answer
                    ? 'right'
                    : k === picked
                      ? 'wrong'
                      : 'off';
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => choose(k)}
                  disabled={picked !== null}
                  className={cn(
                    'lp-press flex h-12 items-center gap-3 rounded-[12px] border-2 px-4 text-left font-mono text-[14.5px] transition-colors duration-150',
                    state === 'idle' && 'border-line-strong text-fg hover:border-accent',
                    state === 'right' && 'border-success bg-success-soft text-fg',
                    state === 'wrong' && 'border-danger bg-danger-soft text-fg',
                    state === 'off' && 'border-line text-subtle',
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-[6px] border border-current text-[12px] font-sans font-semibold opacity-70">
                    {k + 1}
                  </span>
                  <span className="flex-1">{c}</span>
                  {state === 'right' && <Check className="size-5 text-success" />}
                  {state === 'wrong' && <X className="size-5 text-danger" />}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex min-h-[72px] items-center gap-3" aria-live="polite">
            {picked !== null && (
              <>
                <Djeli pose={right ? 'celebrate' : 'point'} size={64} className="shrink-0" />
                <p className="flex-1 text-[14px] leading-relaxed text-muted">
                  <b className={right ? 'text-success' : 'text-danger'}>
                    {right ? 'Bien vu, +5 XP.' : 'Presque.'}
                  </b>{' '}
                  {q.explain}
                </p>
                <button
                  type="button"
                  onClick={next}
                  className="lp-press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-fg px-4 text-[14.5px] font-semibold text-canvas"
                >
                  {i + 1 >= DEMO_QUIZ.length ? 'Terminer' : 'Suivant'}
                  <ArrowRight className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const { run: tryDemo, busy } = useTryDemo();
  const [tab, setTab] = useState(0);
  const current = TABS[tab];

  return (
    <div className="bg-canvas">
      {/* ---------- Héros : bleu nuit uni, texte centré, produit en dessous ---------- */}
      <section className="relative overflow-hidden bg-[#0a0f1f] text-white">
        <Link
          to="/apprendre"
          className="flex items-center justify-center gap-2 border-b border-white/10 px-4 py-2.5 text-[13px] text-white/75 transition-colors hover:text-white"
        >
          <span className="rounded-full bg-[#f2b33d] px-2 py-0.5 text-[11px] font-bold text-[#0a0f1f]">
            Nouveau
          </span>
          Apprends à coder 10 minutes par jour avec Djeli
          <ArrowRight className="size-3.5" />
        </Link>

        <div className="mx-auto max-w-[1120px] px-4 pt-20 text-center sm:px-6 sm:pt-28">
          <h1 className="mx-auto max-w-[900px] text-[44px] leading-[0.98] font-extrabold tracking-[-0.035em] sm:text-[76px]">
            Apprends, code et grandis ensemble<span className="text-[#f2b33d]">.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-relaxed text-white/70 sm:text-[20px]">
            DevHub réunit les devs débutants et confirmés : cours gratuits, entraide, projets,
            emplois et l’actu tech.
          </p>
          <div className="mt-9 flex flex-col items-center gap-4">
            <SignUpInline id="hero-email" />
            {/* Les comptes de démonstration n'existent qu'avec le serveur simulé (ADR-0016). */}
            {api.mode === 'local' && (
              <button
                type="button"
                onClick={tryDemo}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-white/85 hover:text-white disabled:opacity-60"
              >
                {busy ? 'Ouverture…' : 'Visiter sans compte'}
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>

          {/* Produit à onglets, comme GitHub : les onglets changent la capture */}
          <div
            role="tablist"
            aria-label="Aperçu de DevHub"
            className="no-scrollbar mx-auto mt-16 flex max-w-full gap-1 overflow-x-auto sm:justify-center"
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
                  'lp-press h-9 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors duration-150',
                  i === tab ? 'bg-white text-[#0a0f1f]' : 'text-white/65 hover:text-white',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p
            key={current.id}
            className="lp-fade mx-auto mt-4 max-w-[560px] text-[15px] text-white/60"
          >
            {current.text}
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-[1180px] px-4 sm:px-6">
          <Djeli
            pose="wave"
            size={120}
            eager
            className="absolute -top-[86px] right-[6%] z-10 hidden sm:inline-grid"
          />
          <div id="lp-shot" role="tabpanel" className="relative translate-y-0">
            <Screen
              key={current.id}
              src={current.src}
              alt={`Capture de DevHub : ${current.label}`}
              className="lp-fade"
              eager
            />
          </div>
        </div>
        {/* Le bas de la capture déborde sur la section claire suivante */}
        <div aria-hidden className="h-24 sm:h-40" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-canvas sm:h-40" />
      </section>

      {/* ---------- Logos ---------- */}
      <section aria-label="Écosystème" className="mx-auto max-w-[1280px] px-4 pt-6 pb-20 sm:px-6">
        <p className="text-center text-[13px] text-subtle">
          Branché sur les outils que tu utilises déjà
        </p>
        {/* Défilement continu, en pause au survol ; figé si « réduire les animations » */}
        <div className="lp-marquee mt-7 overflow-hidden">
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

      {/* ---------- Pour qui ---------- */}
      <section className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6">
        <h2 className="max-w-[720px] text-[36px] leading-[1.05] font-bold tracking-[-0.03em] text-fg sm:text-[52px]">
          Une place pour chaque dev, et pour ceux qui ne le sont pas encore.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[20px] bg-line-strong md:grid-cols-3">
          {PROFILES.map((p) => (
            <div key={p.who} className="flex flex-col bg-canvas p-7 sm:p-8">
              <Djeli pose={p.pose} size={84} className="-ml-2" />
              <p className="mt-5 text-[13px] font-semibold text-accent-text">{p.who}</p>
              <h3 className="mt-1 text-[24px] leading-tight font-bold tracking-[-0.02em] text-fg">
                {p.title}
              </h3>
              <ul className="mt-5 flex flex-col gap-2.5">
                {p.points.map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-[15px] text-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-teal-text" />
                    {x}
                  </li>
                ))}
              </ul>
              <Link
                to={p.to}
                className="mt-auto inline-flex items-center gap-1 pt-7 text-[15px] font-semibold text-fg hover:text-accent-text"
              >
                {p.cta}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Apprendre : le cœur pour les nouveaux devs ---------- */}
      <section className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-[13px] font-semibold text-gold-text">Apprendre</p>
          <h2 className="mt-2 text-[36px] leading-[1.05] font-bold tracking-[-0.03em] text-fg sm:text-[48px]">
            Un peu chaque jour, pour de vrai.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            Des leçons courtes, des quiz qui expliquent la bonne réponse, des projets à mettre en
            ligne. Ta série te garde motivé, Djeli te dit quoi faire ensuite.
          </p>
          <dl className="mt-10 grid grid-cols-3 border-t border-line-strong">
            {[
              [PATHS.length, 'parcours'],
              [LESSONS, 'leçons et quiz'],
              [PLATFORM_CERTS.length, 'certifications'],
            ].map(([n, l]) => (
              <div key={l} className="pt-5 pr-4">
                <dt className="font-display text-[40px] leading-none font-bold tracking-[-0.03em] text-fg tabular-nums">
                  {n}
                </dt>
                <dd className="mt-2 text-[13.5px] text-muted">{l}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/apprendre"
            className="lp-press mt-10 inline-flex h-11 items-center gap-2 rounded-[10px] bg-fg px-5 text-[15px] font-semibold text-canvas"
          >
            Commencer gratuitement
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <QuizDemo />
      </section>

      {/* ---------- En direct (T1) : ce qui se passe vraiment sur DevHub ---------- */}
      <LiveSection />

      {/* ---------- Appel final ---------- */}
      <section className="px-4 pt-8 pb-24 sm:px-6">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center rounded-[28px] bg-[#0a0f1f] px-6 py-16 text-center text-white sm:py-20">
          <Djeli pose="celebrate" size={104} />
          <h2 className="mt-5 max-w-[680px] text-[36px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[52px]">
            Ton QG de dev t’attend<span className="text-[#f2b33d]">.</span>
          </h2>
          <p className="mt-4 max-w-[480px] text-[17px] text-white/65">
            Ta première ligne de code ou ta millième PR : il y a une place pour toi.
          </p>
          <SignUpInline id="cta-email" className="mt-8" />
          <Link
            to="/connexion"
            className="mt-5 text-[14px] font-medium text-white/65 hover:text-white"
          >
            Déjà inscrit ? Se connecter
          </Link>
        </div>
      </section>
    </div>
  );
}

const LIVE_REFRESH_MS = 30_000;

/**
 * T1 : ce qui se passe vraiment sur DevHub, sans compte. Compteurs de l'écran d'impact,
 * questions récentes (anonymes) et trois Passports. Rien n'est inventé : sans données,
 * la page le dit.
 */
function LiveSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';
  const { data, error, refresh } = useQuery<PublicLanding>('landing:live', () => api.getLanding());

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh().catch(() => {});
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const stats = [
    { label: t('pub.liveDevs'), value: data?.stats.devs },
    { label: t('pub.liveResolved'), value: data?.stats.questionsResolved },
    { label: t('pub.liveCountries'), value: data?.stats.countries },
  ];

  return (
    <section aria-labelledby="live-title" className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6">
      <div className="flex items-center gap-2">
        <span aria-hidden className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>
        <h2 id="live-title" className="text-[20px] font-bold tracking-[-0.02em] text-fg">
          {t('pub.liveTitle')}
        </h2>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="dh-card px-4 py-4 sm:px-6">
            <dt className="text-[13px] text-muted">{s.label}</dt>
            <dd className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-fg tabular-nums sm:text-[32px]">
              {s.value === undefined ? error ? '—' : <Skeleton className="h-8 w-14" /> : s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="dh-card p-5">
          <h3 className="text-[15px] font-semibold text-fg">{t('pub.liveFeed')}</h3>
          {!data && !error ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !data?.live.length ? (
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              {error ? t('pub.liveUnavailable') : t('pub.liveEmpty')}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line" aria-live="polite">
              {data.live.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  {a.kind === 'resolved' ? (
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-muted">
                      {a.kind === 'resolved'
                        ? t('pub.liveResolvedIn', { count: Number(a.detail) || 1 })
                        : t('pub.liveAsked')}
                      {' · '}
                      <Ago iso={a.createdAt} />
                    </p>
                    <Link
                      to={a.targetHref}
                      className="line-clamp-1 text-[14px] font-medium text-fg hover:underline"
                    >
                      {a.targetLabel}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dh-card p-5">
          <h3 className="text-[15px] font-semibold text-fg">{t('pub.liveFeatured')}</h3>
          {data && !data.featured.length ? (
            <p className="mt-3 text-[14px] leading-relaxed text-muted">{t('pub.liveNoDevs')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(data?.featured ?? []).map((d) => (
                <li key={d.handle}>
                  <Link
                    to={`/u/${d.handle}`}
                    className="flex items-center gap-3 rounded-[8px] p-2 hover:bg-surface-1"
                  >
                    <Avatar name={d.displayName} src={d.avatarUrl ?? undefined} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-fg">
                        {d.displayName}
                      </span>
                      <span className="block truncate text-[12px] text-subtle">
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
    </section>
  );
}
