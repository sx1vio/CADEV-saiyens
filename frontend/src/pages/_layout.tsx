import { PanelRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, useMedia } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

/** Conteneur de page : même grille partout (règle n°6), entrée en fondu-glissé. */
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn('dh-page mx-auto w-full px-4 py-5 sm:px-6', wide ? 'max-w-7xl' : 'max-w-[1080px]', className)}>{children}</div>
}

/**
 * Page + panneau contextuel (4e colonne façon Discord).
 * ≥ 1280 px : colonne fixe à droite. En dessous : bouton « Détails » qui ouvre une feuille
 * (panneau latéral sur tablette, bottom sheet sur mobile).
 */
export function WithPanel({ children, panel, panelTitle, className }: { children: ReactNode; panel: ReactNode; panelTitle: string; className?: string }) {
  const xl = useMedia('(min-width: 1280px)')
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-5 sm:px-6', className)}>
      <div className="dh-page min-w-0 flex-1">
        {!xl && (
          <Button
            variant="secondary"
            size="sm"
            icon={<PanelRight />}
            onClick={() => setOpen(true)}
            className="fixed right-4 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+14px)] z-30 rounded-full shadow-lg sm:static sm:float-right sm:mb-2 sm:ml-3 sm:shadow-raised"
          >
            {panelTitle}
          </Button>
        )}
        {children}
      </div>
      {xl ? (
        <aside className="sticky top-[calc(var(--topbar-h)+24px)] flex max-h-[calc(100dvh-var(--topbar-h)-48px)] w-[var(--panel-w)] shrink-0 flex-col gap-4 self-start overflow-y-auto">{panel}</aside>
      ) : (
        <Sheet open={open} onOpenChange={setOpen} title={panelTitle} side="right" size="sm">
          <div className="flex flex-col gap-4">{panel}</div>
        </Sheet>
      )}
    </div>
  )
}
