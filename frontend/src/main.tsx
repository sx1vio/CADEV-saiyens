import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import './styles/globals.css'
import { i18nReady } from './i18n'
import { router } from './app/router'
import { TooltipProvider } from './components/ui/overlay'
import { startNetwork } from './offline/network'
import { useSession, useUI } from './stores/app'

function Toasts() {
  const theme = useUI((s) => s.theme)
  return (
    <Toaster
      theme={theme}
      position="bottom-center"
      offset={{ bottom: 'calc(var(--tabbar-h) + 24px)' }}
      mobileOffset={{ bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px)' }}
      toastOptions={{
        classNames: {
          toast: '!rounded-[14px] !border !border-line !bg-surface-3 !text-fg !shadow-lg',
          description: '!text-muted',
        },
      }}
    />
  )
}

async function boot() {
  startNetwork()
  await Promise.all([useSession.getState().load(), i18nReady])
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={300}>
            <RouterProvider router={router} />
            <Toasts />
          </TooltipProvider>
      </MotionConfig>
    </StrictMode>,
  )
  // Service worker (O1) : enregistré après le premier rendu, jamais bloquant.
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
  }
}

void boot()
