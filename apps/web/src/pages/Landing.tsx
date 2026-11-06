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
import { useEffect, useState, type ComponentType, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import shotCerts from '@/assets/product/certs.webp';
import shotFeed from '@/assets/product/feed.webp';
import shotPrevol from '@/assets/product/prevol.webp';
import { Djeli } from '@/components/djeli';
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
import { useSession } from '@/stores/app';
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
        className="lg-clear h-12 min-w-0 flex-1 rounded-full px-5 text-[15px] text-fg outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
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
    text: 'Secrets exposés, premier affichage en 3G, failles connues, licences, Lighthouse mobile, montée en charge. Aussi en action GitHub et en serveur MCP.',
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
    text: 'Héberge chez Systalink, à Dakar : ta salle de projet affiche la preuve que l’app tourne en production.',
    to: '/systalink',
  },
];

export default function Landing() {
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
          Le réseau des développeurs africains
        </p>
        <h1 className="mx-auto mt-6 max-w-[920px] text-[42px] leading-[1.02] font-bold tracking-[-0.035em] text-fg sm:text-[68px]">
          Le réseau pro des devs qui livrent.
        </h1>
        <p className="mx-auto mt-5 max-w-[680px] text-[17px] leading-relaxed text-fg/80 sm:text-[19px]">
          L’actu tech, l’entraide et les emplois au même endroit, des certifications qu’un recruteur
          peut vérifier, et les outils pour lancer une app qui tient : pré-vol et banc d’essai.
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
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="surface-card flex flex-col p-6">
              <h3 className="text-[22px] font-bold tracking-[-0.02em] text-fg">{p.title}</h3>
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
                      <ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Du prompt à la prod vérifiée ---------- */}
      <section className="bg-[#1e1f22] py-20 text-white">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
          <p className="text-[14px] font-semibold text-[#8ab4ff]">Du prompt à la prod vérifiée</p>
          <h2 className="mt-2 max-w-[760px] text-[34px] leading-[1.06] font-bold tracking-[-0.03em] sm:text-[48px]">
            Ton IA a écrit le code. DevHub vérifie qu’il tient.
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SHIP_STEPS.map((s) => (
              <li key={s.n} className="flex flex-col rounded-[18px] bg-white/[0.06] p-5">
                <span className="grid size-9 place-items-center rounded-full bg-white text-[15px] font-bold text-[#1e1f22]">
                  {s.n}
                </span>
                <h3 className="mt-4 text-[18px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/80">{s.text}</p>
                {s.to && (
                  <Link
                    to={s.to}
                    className="mt-auto inline-flex items-center gap-1 pt-5 text-[14px] font-semibold text-white hover:underline"
                  >
                    Découvrir
                    <ArrowRight className="size-4" />
                  </Link>
                )}
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
