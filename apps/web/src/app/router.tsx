import {
  createBrowserRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
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
const AskDialog = reactLazy(() =>
  import('@/components/AskDialog').then((m) => ({ default: m.AskDialog })),
);
const Tour = reactLazy(() => import('@/components/Tour').then((m) => ({ default: m.Tour })));

/** Monte un composant paresseux dès sa première ouverture, puis le garde (animations de sortie). */
function useOnceTrue(v: boolean) {
  const [seen, setSeen] = useState(v);
  useEffect(() => {
    if (v) setSeen(true);
  }, [v]);
  return seen || v;
}

function Overlays() {
  const user = useSession((s) => s.user);
  const palette = useOnceTrue(useUI((s) => s.paletteOpen));
  const shortcuts = useOnceTrue(useUI((s) => s.shortcutsOpen));
  const sync = useOnceTrue(useUI((s) => s.syncOpen));
  const ask = useOnceTrue(useUI((s) => s.askOpen));
  const tour = useUI((s) => s.tourStep) !== null;
  return (
    <Suspense fallback={null}>
      {palette && <CommandPalette />}
      {shortcuts && <ShortcutsDialog />}
      {sync && <SyncCenter />}
      {user && ask && <AskDialog />}
      {user && tour && <Tour />}
    </Suspense>
  );
}
import { PublicShell } from '@/components/shell/PublicShell';
import { useGlobalShortcuts } from '@/components/shell/shortcuts';
import { useSession, useUI } from '@/stores/app';
import { cn } from '@/lib/utils';

/* Pages chargées à la demande, puis préchargées en arrière-plan (navigation instantanée). */
const pages = {
  landing: () => import('@/pages/Landing'),
  login: () => import('@/pages/Login'),
  onboarding: () => import('@/pages/Onboarding'),
  home: () => import('@/pages/Feed'),
  post: () => import('@/pages/PostPage'),
  publish: () => import('@/pages/Publish'),
  community: () => import('@/pages/Communities'),
  communities: () => import('@/pages/Communities').then((m) => ({ default: m.CommunityList })),
  jobs: () => import('@/pages/Jobs'),
  jobPublish: () => import('@/pages/JobPublish'),
  certs: () => import('@/pages/Certifications'),
  certExam: () => import('@/pages/CertExam'),
  skills: () => import('@/pages/Skills'),
  skill: () => import('@/pages/Skills').then((m) => ({ default: m.SkillDetail })),
  videos: () => import('@/pages/Videos'),
  watch: () => import('@/pages/Videos').then((m) => ({ default: m.Watch })),
  ytWatch: () => import('@/pages/Videos').then((m) => ({ default: m.YtWatch })),
  sources: () => import('@/pages/Sources'),
  learn: () => import('@/pages/Learn'),
  learnPath: () => import('@/pages/Learn').then((m) => ({ default: m.PathPage })),
  lesson: () => import('@/pages/Learn').then((m) => ({ default: m.LessonPage })),
  build: () => import('@/pages/BuildGuide'),
  templates: () => import('@/pages/Templates'),
  sos: () => import('@/pages/SosList'),
  question: () => import('@/pages/Question'),
  projects: () => import('@/pages/Projects'),
  newRoom: () => import('@/pages/NewRoom'),
  room: () => import('@/pages/Room'),
  discover: () => import('@/pages/Discover'),
  leaderboard: () => import('@/pages/Leaderboard'),
  passport: () => import('@/pages/Passport'),
  systalink: () => import('@/pages/Systalink'),
  impact: () => import('@/pages/Impact'),
  rules: () => import('@/pages/Rules'),
  admin: () => import('@/pages/Admin'),
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
    [pages.sos, pages.jobs, pages.videos, pages.learn, pages.build, pages.post].forEach(
      (p) => void p(),
    );
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 6000 });
  else setTimeout(run, 4000);
}

/** Fine barre de progression pendant le chargement d'une page (jamais d'écran blanc). */
function NavProgress() {
  const navigation = useNavigation();
  const loading = navigation.state === 'loading';
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 origin-left bg-hero transition-[transform,opacity] duration-300',
        loading ? 'scale-x-75 opacity-100' : 'scale-x-100 opacity-0',
      )}
    />
  );
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
      <NavProgress />
      <ScrollRestoration />
      {location.pathname === '/bienvenue' || location.pathname === '/connexion' ? (
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

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { index: true, element: <IndexSwitch /> },
      { path: 'connexion', lazy: lazy('login') },
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
      { path: 'communautes', lazy: lazy('communities') },
      { path: 'c/:slug', lazy: lazy('community') },
      {
        path: 'emplois/publier',
        lazy: async () => {
          const m = await pages.jobPublish();
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
      { path: 'certifications', lazy: lazy('certs') },
      { path: 'certifications/:id', lazy: lazy('certExam') },
      { path: 'skills', lazy: lazy('skills') },
      { path: 'skills/:id', lazy: lazy('skill') },
      { path: 'videos', lazy: lazy('videos') },
      { path: 'videos/yt/:vid', lazy: lazy('ytWatch') },
      { path: 'videos/:id', lazy: lazy('watch') },
      { path: 'sources', lazy: lazy('sources') },
      { path: 'apprendre', lazy: lazy('learn') },
      { path: 'apprendre/:pathId', lazy: lazy('learnPath') },
      { path: 'apprendre/:pathId/:lessonId', lazy: lazy('lesson') },
      { path: 'creer', lazy: lazy('build') },
      { path: 'templates', lazy: lazy('templates') },
      { path: 'sos', lazy: lazy('sos') },
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
      { path: 'classement', lazy: lazy('leaderboard') },
      { path: 'u/:handle', lazy: lazy('passport') },
      { path: 'systalink', lazy: lazy('systalink') },
      { path: 'impact', lazy: lazy('impact') },
      { path: 'regles', lazy: lazy('rules') },
      {
        path: 'admin',
        lazy: async () => {
          const m = await pages.admin();
          return {
            element: (
              <RequireAuth>
                <m.default />
              </RequireAuth>
            ),
          };
        },
      },
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
      { path: '*', lazy: lazy('notFound') },
    ],
  },
]);
