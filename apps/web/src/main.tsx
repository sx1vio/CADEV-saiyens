import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { MotionConfig } from 'motion/react';
import './styles/globals.css';
import { i18nReady } from './i18n';
import { router } from './app/router';
import { TooltipProvider } from './components/ui/overlay';
import { startNetwork } from './offline/network';
import { useSession, useUI } from './stores/app';

/** Chargé après le premier affichage : les toasts ne servent qu'après une action. */
const Toaster = lazy(() => import('sonner').then((m) => ({ default: m.Toaster })));

function Toasts() {
  const theme = useUI((s) => s.theme);
  return (
    <Toaster
      theme={theme}
      position="bottom-center"
      offset={{ bottom: 'calc(var(--tabbar-h) + 24px)' }}
      mobileOffset={{ bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px)' }}
      toastOptions={{
        classNames: {
          toast: '!rounded-[10px] !border !border-line !bg-surface-3 !text-fg !shadow-lg',
          description: '!text-muted',
        },
      }}
    />
  );
}

async function boot() {
  startNetwork();
  await Promise.all([useSession.getState().load(), i18nReady]);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <Suspense fallback={null}>
            <Toasts />
          </Suspense>
        </TooltipProvider>
      </MotionConfig>
    </StrictMode>,
  );
  // Service worker (O1) : enregistré après le premier rendu, jamais bloquant.
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // Nouvelle version déployée : vérifiée au retour sur l'onglet et toutes les 30 min, puis
    // installée et rechargée seule (registerType autoUpdate) ; un onglet resté ouvert suit donc.
    void import('virtual:pwa-register').then(({ registerSW }) =>
      registerSW({
        immediate: true,
        onRegisteredSW(_url, reg) {
          if (!reg) return;
          const check = () => void reg.update().catch(() => {});
          setInterval(check, 30 * 60_000);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') check();
          });
        },
      }),
    );
  }
}

void boot();
