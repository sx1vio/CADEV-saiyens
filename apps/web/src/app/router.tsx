import {
  useRouteError,
  createBrowserRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
} from 'react-router';
import { lazy as reactLazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { PageSkeleton } from '@/pages/_skeleton';

/* Le shell connecté et les dialogues ne sont téléchargés que lorsqu'ils servent (budget < 300 Ko). */
const AppShell = reactLazy(() =>
  import('@/components/shell/AppShell').then((m) => ({ default: m.AppShell })),
);
const CommandPalette = reactLazy(() =>
  import('@/components/shell/CommandPalette').then((m) => ({ default: m.CommandPalette })),
);
const ShortcutsDialog = reactLazy(() =>
  import('@/components/shell/CommandPalette').then((m) => ({ default: m.ShortcutsDialog })),
);
const SyncCenter = reactLazy(() =>
  import('@/components/shell/network').then((m) => ({ default: m.SyncCenter })),
);
const ConflictSheet = reactLazy(() =>
  import('@/components/EditText').then((m) => ({ default: m.ConflictSheet })),
);
const AskDialog = reactLazy(() =>
  import('@/components/AskDialog').then((m) => ({ default: m.AskDialog })),
);
const Tour = reactLazy(() => import('@/components/Tour').then((m) => ({ default: m.Tour })));

/** Monte un composant paresseux dès sa première ouverture, puis le garde (animations de sortie). */
function useOnceTrue(v: boolean) {
  const [seen, setSeen] = useState(v);
  if (v && !seen) setSeen(true);
  return seen || v;
}

function Overlays() {
  const user = useSession((s) => s.user);
  const palette = useOnceTrue(useUI((s) => s.paletteOpen));
  const shortcuts = useOnceTrue(useUI((s) => s.shortcutsOpen));
  const sync = useOnceTrue(useUI((s) => s.syncOpen));
  const ask = useOnceTrue(useUI((s) => s.askOpen));
  const conflict = useUI((s) => s.conflictId) !== null;
  const tour = useUI((s) => s.tourStep) !== null;
  return (
    <Suspense fallback={null}>
      {palette && <CommandPalette />}
      {shortcuts && <ShortcutsDialog />}
      {sync && <SyncCenter />}
      {user && ask && <AskDialog />}
      {user && conflict && <ConflictSheet />}
      {user && tour && <Tour />}
    </Suspense>
  );
}
import { PublicShell } from '@/components/shell/PublicShell';
import { useGlobalShortcuts } from '@/components/shell/shortcuts';
import { useSession, useUI } from '@/stores/app';

/* Pages chargées à la demande, puis préchargées en arrière-plan (navigation instantanée). */
const pages = {
  landing: () => import('@/pages/Landing'),
  login: () => import('@/pages/Login'),
  passwordReset: () => import('@/pages/PasswordReset'),
  onboarding: () => import('@/pages/Onboarding'),
  home: () => import('@/pages/Feed'),
  post: () => import('@/pages/PostPage'),
  publish: () => import('@/pages/Publish'),
  jobs: () => import('@/pages/Jobs'),
  company: () => import('@/pages/CompanyPage'),
  messages: () => import('@/pages/Messages'),
  privacy: () => import('@/pages/Privacy'),
  certs: () => import('@/pages/Certifications'),
  certExam: () => import('@/pages/CertExam'),
  certVerify: () => import('@/pages/CertVerify'),
  skills: () => import('@/pages/Skills'),
  skill: () => import('@/pages/Skills').then((m) => ({ default: m.SkillDetail })),
  sources: () => import('@/pages/Sources'),
  lessonPlayer: () => import('@/pages/LessonPlayer'),
  question: () => import('@/pages/Question'),
  projects: () => import('@/pages/Projects'),
  newRoom: () => import('@/pages/NewRoom'),
  room: () => import('@/pages/Room'),
  discover: () => import('@/pages/Discover'),
  africaMap: () => import('@/pages/AfricaMapPage'),
  passport: () => import('@/pages/Passport'),
  systalink: () => import('@/pages/Systalink'),
  systalinkHelp: () => import('@/pages/SystalinkHelp'),
  preflight: () => import('@/pages/Preflight'),
  bench: () => import('@/pages/Bench'),
  impact: () => import('@/pages/Impact'),
  rules: () => import('@/pages/Rules'),
  settings: () => import('@/pages/Settings'),
  notFound: () => import('@/pages/NotFound'),
};

const lazy = (k: keyof typeof pages) => () => pages[k]().then((m) => ({ Component: m.default }));

/**
 * Préchargement discret des pages principales, seulement sur une bonne connexion
 * et sans « économie de données » (O6) : la navigation devient instantanée sans gaspiller la data.
 */
export function preloadCorePages() {
  const c = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (c?.saveData || (c?.effectiveType && c.effectiveType !== '4g')) return;
  const run = () =>
    [pages.jobs, pages.question, pages.certs, pages.preflight, pages.post].forEach((p) => void p());
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 6000 });
  else setTimeout(run, 4000);
}

/** Choisit le shell selon la session ; redirige vers l'onboarding si le profil n'est pas terminé. */
function Root() {
  const user = useSession((s) => s.user);
  const location = useLocation();
  useGlobalShortcuts();
  useEffect(() => {
    if (user) preloadCorePages();
  }, [user]);
  if (user && !user.codeOfConductAcceptedAt && location.pathname !== '/bienvenue')
    return <Navigate to="/bienvenue" replace />;
  return (
    <>
      <ScrollRestoration />
      {['/bienvenue', '/connexion', '/inscription', '/mot-de-passe'].includes(location.pathname) ||
      location.pathname.startsWith('/lecon/') ? (
        <Outlet />
      ) : user ? (
        <Suspense fallback={<PageSkeleton />}>
          <AppShell />
        </Suspense>
      ) : (
        <PublicShell />
      )}
      <Overlays />
    </>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useSession((s) => s.user);
  const location = useLocation();
  if (!user)
    return <Navigate to={`/connexion?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

function IndexSwitch() {
  const user = useSession((s) => s.user);
  return user ? <HomeRoute /> : <LandingRoute />;
}

const HomeLazy = reactLazy(pages.home);
const LandingLazy = reactLazy(pages.landing);
const HomeRoute = () => (
  <Suspense fallback={<PageSkeleton />}>
    <HomeLazy />
  </Suspense>
);
const LandingRoute = () => (
  <Suspense fallback={<PageSkeleton />}>
    <LandingLazy />
  </Suspense>
);

/**
 * Écran d'erreur de route : jamais l'écran brut du routeur. Un module mis à jour pendant
 * une session (nouvelle version déployée) se règle par un rechargement.
 */
function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : '';
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[13px] text-subtle">erreur</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.011em] text-fg">
          Cette page n’a pas pu s’afficher.
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Une nouvelle version de DevHub est peut-être disponible. Recharge la page ; si le problème
          continue, reviens à l’accueil.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="lg-tint h-10 rounded-full px-5 text-[14px] font-semibold"
          >
            Recharger
          </button>
          <a
            href="/"
            className="lg-clear inline-flex h-10 items-center rounded-full px-5 text-[14px] font-semibold"
          >
            Accueil
          </a>
        </div>
        {import.meta.env.DEV && message && (
          <pre className="mt-6 overflow-auto rounded-[8px] bg-surface-1 p-3 text-left font-mono text-[12px] text-muted">
            {message}
          </pre>
        )}
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <IndexSwitch /> },
      { path: 'connexion', lazy: lazy('login') },
      { path: 'inscription', lazy: lazy('login') },
      { path: 'mot-de-passe', lazy: lazy('passwordReset') },
      {
        path: 'bienvenue',
        lazy: async () => {
          const m = await pages.onboarding();
          return {
            element: (
              <RequireAuth>
                <m.default />
              </RequireAuth>
            ),
          };
        },
      },
      { path: 'post/:id', lazy: lazy('post') },
      {
        path: 'publier',
        lazy: async () => {
          const m = await pages.publish();
          return {
            element: (
              <RequireAuth>
                <m.default />
              </RequireAuth>
            ),
          };
        },
      },
      { path: 'emplois', lazy: lazy('jobs') },
      { path: 'emplois/:id', lazy: lazy('jobs') },
      { path: 'entreprises/:slug', lazy: lazy('company') },
      ...['messages', 'messages/:id'].map((path) => ({
        path,
        lazy: async () => {
          const m = await pages.messages();
          return {
            element: (
              <RequireAuth>
                <m.default />
              </RequireAuth>
            ),
          };
        },
      })),
      { path: 'certifications', lazy: lazy('certs') },
      { path: 'certifications/:id', lazy: lazy('certExam') },
      { path: 'certificat/:code', lazy: lazy('certVerify') },
      { path: 'skills', lazy: lazy('skills') },
      { path: 'skills/:id', lazy: lazy('skill') },
      { path: 'sources', lazy: lazy('sources') },
      { path: 'lecon/:courseId/:lessonId', lazy: lazy('lessonPlayer') },
      { path: 'prevol', lazy: lazy('preflight') },
      { path: 'prevol/:id', lazy: lazy('preflight') },
      { path: 'banc', lazy: lazy('bench') },
      { path: 'banc/:id', lazy: lazy('bench') },
      { path: 'sos/:id', lazy: lazy('question') },
      { path: 'projets', lazy: lazy('projects') },
      {
        path: 'projets/nouvelle',
        lazy: async () => {
          const m = await pages.newRoom();
          return {
            element: (
              <RequireAuth>
                <m.default />
              </RequireAuth>
            ),
          };
        },
      },
      { path: 'p/:code', lazy: lazy('room') },
      { path: 'decouvrir', lazy: lazy('discover') },
      { path: 'carte', lazy: lazy('africaMap') },
      { path: 'u/:handle', lazy: lazy('passport') },
      { path: 'systalink', lazy: lazy('systalink') },
      { path: 'systalink/aide', lazy: lazy('systalinkHelp') },
      { path: 'impact', lazy: lazy('impact') },
      { path: 'regles', lazy: lazy('rules') },
      { path: 'confidentialite', lazy: lazy('privacy') },
      {
        path: 'reglages',
        lazy: async () => {
          const m = await pages.settings();
          return {
            element: (
              <RequireAuth>
                <m.default />
              </RequireAuth>
            ),
          };
        },
      },
      // Sections retirées le 05/11/2026 : les anciens liens mènent à leur nouvelle place.
      ...(
        [
          ['sos', '/?f=questions'],
          ['communautes', '/'],
          ['c/:slug', '/'],
          ['videos', '/'],
          ['videos/*', '/'],
          ['apprendre', '/certifications'],
          ['apprendre/*', '/certifications'],
          ['creer', '/prevol'],
          ['templates', '/prevol'],
          ['classement', '/decouvrir'],
        ] as const
      ).map(([path, to]) => ({ path, element: <Navigate to={to} replace /> })),
      { path: '*', lazy: lazy('notFound') },
    ],
  },
]);
