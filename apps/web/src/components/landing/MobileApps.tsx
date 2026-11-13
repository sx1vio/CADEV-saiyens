import {
  AirplaneTakeoff,
  AndroidLogo,
  AppleLogo,
  Bell,
  Briefcase,
  Certificate,
  ChatCircleDots,
  DeviceMobile,
  FolderSimple,
  House,
  Lightning,
  List,
  LockKey,
  MagnifyingGlass,
  Plus,
  WifiHigh,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand';
import { cn } from '@/lib/utils';

/* ==================================================================
   Landing : les applications mobiles (Android et iOS, Kotlin Multiplatform), « bientôt ».
   Les deux écrans sont dessinés en code et reprennent l'interface mobile réelle de DevHub :
   en-tête, carte de publication, onglets, barre d'onglets flottante. Aucune capture inventée.
   ================================================================== */

const FEATURES = [
  {
    icon: Briefcase,
    title: 'Emplois et pré-vol',
    text: 'Postule, suis tes candidatures et lance un pré-vol depuis ton téléphone.',
  },
  {
    icon: Bell,
    title: 'Alertes en direct',
    text: 'Une réponse à ta question, une candidature, une revue de code : tu le sais tout de suite.',
  },
  {
    icon: Lightning,
    title: 'Légère en 3G',
    text: 'Native, rapide sur un Android d’entrée de gamme, économe en data.',
  },
  {
    icon: LockKey,
    title: 'Ton compte, protégé',
    text: 'Connexion GitHub (PKCE) ou e-mail, session dans le coffre du téléphone (Keystore, Keychain).',
  },
];

export function MobileAppsSection() {
  return (
    <section
      aria-labelledby="mobile-title"
      className="relative overflow-hidden bg-[linear-gradient(180deg,#0b1f4d_0%,#0a1433_55%,#0b0b0c_100%)] py-20 text-white"
    >
      {/* Halo discret derrière les téléphones. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-[-10%] size-[640px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,176,240,0.28),transparent_65%)]"
      />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-[#8ab4ff] ring-1 ring-white/15">
            <DeviceMobile weight="fill" className="size-4" />
            Applications mobiles · bientôt
          </p>
          <h2
            id="mobile-title"
            className="mt-4 max-w-[560px] text-[34px] leading-[1.06] font-bold tracking-[-0.03em] sm:text-[48px]"
          >
            DevHub dans ta poche.
          </h2>
          <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-white/80">
            Les applications natives Android et iOS arrivent : le même compte, le même fil, la même
            interface que sur le web.
          </p>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/10 text-[#7fd3ff] ring-1 ring-white/10">
                  <f.icon weight="fill" className="size-5" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{f.title}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-relaxed text-white/70">
                    {f.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap gap-3">
            <StoreBadge icon={<AndroidLogo weight="fill" />} store="Android" />
            <StoreBadge icon={<AppleLogo weight="fill" />} store="iPhone et iPad" />
          </div>
          <p className="mt-4 text-[13.5px] text-white/60">
            En attendant, la version web s’installe comme une application : dans ton navigateur, «
            Ajouter à l’écran d’accueil ».
          </p>
        </div>

        {/* Deux téléphones ; un seul sous 640 px. */}
        <div className="relative mx-auto flex h-[600px] w-full max-w-[520px] items-center justify-center">
          <Phone className="absolute left-1/2 z-[2] -translate-x-1/2 sm:left-[4%] sm:translate-x-0 sm:-rotate-[4deg]">
            <HomeScreen />
          </Phone>
          <Phone className="absolute right-[2%] z-[1] hidden translate-y-6 rotate-[5deg] opacity-95 sm:block">
            <JobsScreen />
          </Phone>
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ icon, store }: { icon: ReactNode; store: string }) {
  return (
    <span className="inline-flex h-14 items-center gap-3 rounded-[14px] bg-white/[0.08] px-4 ring-1 ring-white/20 [&_svg]:size-7">
      {icon}
      <span className="flex flex-col leading-tight">
        <span className="text-[11.5px] font-medium tracking-wide text-white/65 uppercase">
          Bientôt sur
        </span>
        <span className="text-[16px] font-semibold">{store}</span>
      </span>
    </span>
  );
}

/** Cadre de téléphone : bords arrondis, île en haut, écran clair comme l'application. */
function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'w-[262px] rounded-[46px] bg-[#0b0b0f] p-[9px] shadow-[0_40px_90px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/15',
        className,
      )}
    >
      <div className="relative h-[540px] overflow-hidden rounded-[38px] bg-[#f4f5f7] font-[Poppins,sans-serif] text-[#111]">
        <div className="flex h-8 items-center justify-between px-6 pt-1 text-[10.5px] font-semibold">
          <span>9:41</span>
          <span className="absolute top-2 left-1/2 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-[#0b0b0f]" />
          <span className="flex items-center gap-1">
            <WifiHigh weight="bold" className="size-3" />
            <span className="h-2.5 w-5 rounded-[3px] border border-black/60 p-[1px]">
              <span className="block h-full w-3/4 rounded-[1px] bg-black/70" />
            </span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="flex items-center gap-2.5 border-b border-black/5 bg-white px-3.5 py-2.5 [&_svg]:size-[18px]">
      <List weight="bold" />
      <BrandMark size={24} />
      <span className="ml-auto flex items-center gap-3">
        <MagnifyingGlass weight="bold" />
        <ChatCircleDots weight="fill" />
        <Bell weight="fill" />
        <span className="size-6 rounded-full bg-gradient-to-br from-[#0a6cff] to-[#20e2b4]" />
      </span>
    </div>
  );
}

function BottomBar({ active }: { active: 'home' | 'jobs' }) {
  const item = (icon: ReactNode, label: string, on = false) => (
    <span
      className={cn(
        'flex w-11 flex-col items-center gap-0.5 text-[8.5px] font-semibold',
        on ? 'text-white' : 'text-white/55',
      )}
    >
      <span
        className={cn(
          'grid h-6 w-9 place-items-center rounded-full [&_svg]:size-[15px]',
          on && 'bg-[#2563eb]',
        )}
      >
        {icon}
      </span>
      {label}
    </span>
  );
  return (
    <div className="absolute inset-x-2.5 bottom-3 flex items-center justify-between rounded-[18px] bg-[#1c1d22] px-2 py-1.5 shadow-lg">
      {item(<House weight="fill" />, 'Accueil', active === 'home')}
      {item(<Briefcase weight="fill" />, 'Emplois', active === 'jobs')}
      <span className="grid size-9 place-items-center rounded-full bg-white text-[#111] [&_svg]:size-4">
        <Plus weight="bold" />
      </span>
      {item(<Certificate weight="fill" />, 'Certifs')}
      {item(<AirplaneTakeoff weight="fill" />, 'Pré-vol')}
    </div>
  );
}

function HomeScreen() {
  return (
    <>
      <TopBar />
      <div className="px-3 pt-3">
        <div className="rounded-[16px] border border-black/5 bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="size-8 shrink-0 rounded-full bg-gradient-to-br from-[#0a6cff] to-[#20e2b4]" />
            <span className="flex-1 rounded-full border border-black/10 px-3 py-1.5 text-[10.5px] text-black/50">
              Partage une avancée…
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[9.5px] font-semibold whitespace-nowrap [&_svg]:size-3.5">
            <span className="flex items-center gap-1">
              <Lightning weight="fill" /> Je suis bloqué
            </span>
            <span className="flex items-center gap-1">
              <FolderSimple weight="fill" /> Un projet
            </span>
            <span className="flex items-center gap-1">
              <DeviceMobile weight="fill" /> Faire tester
            </span>
          </div>
        </div>
        <div className="mt-3 flex gap-4 border-b border-black/10 text-[11px] font-medium">
          <span className="border-b-2 border-black pb-1.5">Pour toi</span>
          <span className="text-black/50">Questions</span>
          <span className="text-black/50">Actualité</span>
        </div>
        <div className="mt-2.5 flex gap-1.5 text-[9.5px] font-semibold">
          <span className="rounded-full bg-[#2563eb] px-2.5 py-1 text-white">Mes sujets</span>
          <span className="rounded-full border border-black/10 bg-white px-2.5 py-1">À la une</span>
          <span className="rounded-full border border-black/10 bg-white px-2.5 py-1">IA</span>
        </div>
        <article className="mt-2.5 rounded-[16px] border border-black/5 bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-[8px] bg-[#111] text-[9px] font-bold text-white">
              HN
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10.5px] font-semibold">Hacker News</span>
              <span className="block text-[9px] text-black/50">il y a 12 min · 3 min</span>
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-snug font-semibold">
            Kotlin Multiplatform : une base de code, Android et iOS natifs
          </p>
          <div className="mt-2 h-16 rounded-[10px] bg-[linear-gradient(135deg,#7f52ff,#0a6cff_60%,#20e2b4)]" />
        </article>
      </div>
      <BottomBar active="home" />
    </>
  );
}

function JobsScreen() {
  return (
    <>
      <TopBar />
      <div className="px-3 pt-3">
        <p className="text-[13px] font-semibold">Emplois</p>
        {[
          ['Développeur React', 'Dakar · Hybride', 'Postulé'],
          ['Ingénieur Laravel', 'Cotonou · Télétravail', 'En attente'],
          ['Dev mobile Flutter', 'Abidjan · Sur site', null],
        ].map(([title, place, status]) => (
          <div
            key={title}
            className="mt-2 flex items-center gap-2.5 rounded-[14px] border border-black/5 bg-white p-2.5"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#e8efff] text-[#2563eb] [&_svg]:size-4">
              <Briefcase weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10.5px] font-semibold">{title}</span>
              <span className="block text-[9px] text-black/50">{place}</span>
            </span>
            {status && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[8.5px] font-semibold',
                  status === 'Postulé'
                    ? 'bg-[#dcfce7] text-[#15803d]'
                    : 'bg-[#fff4d6] text-[#8a5a00]',
                )}
              >
                {status}
              </span>
            )}
          </div>
        ))}
        <div className="mt-3 rounded-[14px] bg-[#0b1f4d] p-3 text-white">
          <p className="text-[10.5px] font-semibold">Pré-vol · monapp.sn</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[22px] font-bold">92</span>
            <span className="rounded-full bg-[#16a34a] px-2 py-0.5 text-[9px] font-semibold">
              GO · DevHub Ready
            </span>
          </div>
        </div>
      </div>
      <BottomBar active="jobs" />
    </>
  );
}
