import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn, storageSet } from '@/lib/utils'
import { useUI } from '@/stores/app'
import { Djeli, type DjeliPose } from './djeli'
import { Button } from './ui/button'
import { useIsMobile } from './ui/overlay'

interface Step {
  key: string
  /** Sélecteurs candidats, le premier visible gagne */
  targets: string[]
  pose: DjeliPose
}

const STEPS: Step[] = [
  { key: 's0', targets: [], pose: 'wave' },
  { key: 's1', targets: ['[data-tour="home"]', '[data-tour="hero"]'], pose: 'point' },
  { key: 's2', targets: ['[data-tour="ask"]', '[data-tour="ask-mobile"]', '[data-tour="hero-ask"]'], pose: 'point' },
  { key: 's3', targets: ['[data-tour="projects"]'], pose: 'point' },
  { key: 's4', targets: ['[data-tour="passport"]', '[data-tour="xp"]'], pose: 'point' },
  { key: 's5', targets: ['[data-tour="network"]'], pose: 'laptop' },
  { key: 's6', targets: ['[data-tour="palette"]'], pose: 'celebrate' },
]

function visibleTarget(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el
    }
  }
  return null
}

type Rect = { top: number; left: number; width: number; height: number }

/**
 * Visite guidée par Djeli (décision docs/decisions.md §4).
 * Projecteur qui glisse d'un élément réel à l'autre, bulle à côté ; clavier : ← → Échap.
 */
export function Tour() {
  const { t } = useTranslation()
  const step = useUI((s) => s.tourStep)
  const setStep = useUI((s) => s.setTourStep)
  const isMobile = useIsMobile()
  const [rect, setRect] = useState<Rect | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const current = step !== null ? STEPS[step] : null
  const total = STEPS.length

  const measure = useCallback(() => {
    if (!current) return
    const el = visibleTarget(current.targets)
    if (!el) return setRect(null)
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const r = el.getBoundingClientRect()
    const pad = 6
    setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
  }, [current])

  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    if (step === null) return
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    const id = setTimeout(measure, 260)
    nextRef.current?.focus()
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      clearTimeout(id)
    }
  }, [step, measure])

  const finish = useCallback(() => {
    storageSet('dh-tour-done', '1')
    setStep(null)
  }, [setStep])

  useEffect(() => {
    if (step === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight') step < total - 1 ? setStep(step + 1) : finish()
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, total, setStep, finish])

  if (step === null || !current) return null

  // Position de la bulle : à droite de la cible si possible, sinon dessous/dessus ; centrée sinon.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(360, vw - 24)
  let cardStyle: React.CSSProperties
  if (isMobile || !rect) {
    cardStyle = isMobile ? { left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom) + 84px)' } : { left: vw / 2 - cardW / 2, top: vh / 2 - 140, width: cardW }
  } else if (rect.left + rect.width + cardW + 40 < vw) {
    cardStyle = { left: rect.left + rect.width + 20, top: Math.max(16, Math.min(vh - 280, rect.top + rect.height / 2 - 110)), width: cardW }
  } else if (rect.top + rect.height + 300 < vh) {
    cardStyle = { left: Math.max(12, Math.min(vw - cardW - 12, rect.left + rect.width - cardW)), top: rect.top + rect.height + 16, width: cardW }
  } else {
    cardStyle = { left: Math.max(12, Math.min(vw - cardW - 12, rect.left)), top: Math.max(12, rect.top - 300), width: cardW }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      {/* Voile avec « trou » autour de la cible */}
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-[16px] ring-2 ring-accent transition-[top,left,width,height] duration-300 ease-out"
          style={{ ...rect, boxShadow: '0 0 0 9999px var(--scrim), 0 0 32px 4px color-mix(in oklab, var(--accent), transparent 50%)' }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[var(--scrim)] backdrop-blur-[2px]" />
      )}
      <div className="fixed inset-0" onClick={finish} aria-hidden />

      <div key={current.key} className="dh-pop fixed z-10" style={cardStyle} data-state="open">
        <div className="relative rounded-[22px] border border-line-strong bg-surface-2 p-5 pt-6 shadow-lg">
          <div className={cn('absolute -top-[84px] left-4', isMobile && 'left-1/2 -translate-x-1/2')}>
            <Djeli pose={current.pose} size={step === 0 ? 112 : 92} float />
          </div>
          <button type="button" onClick={finish} aria-label={t('tour.skip')} className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-subtle hover:bg-surface-3 hover:text-fg">
            <X className="size-4" />
          </button>
          <p className="mt-6 label-caps">{t('tour.of', { n: step + 1, total })}</p>
          <h2 id="tour-title" className="mt-1 text-lg font-semibold tracking-tight text-fg">
            {t(`tour.${current.key}Title`)}
          </h2>
          <p id="tour-text" className="mt-1.5 text-sm leading-relaxed text-muted">
            {t(`tour.${current.key}Text`)}
          </p>
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s.key} className={cn('h-1.5 rounded-full transition-all duration-300', i === step ? 'w-5 bg-accent' : 'w-1.5 bg-line-strong')} />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={finish}>
              {t('tour.skip')}
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="secondary" size="icon-sm" aria-label={t('common.previous')} onClick={() => setStep(step - 1)}>
                  <ArrowLeft />
                </Button>
              )}
              <Button ref={nextRef} variant={step === total - 1 ? 'hero' : 'primary'} size="sm" onClick={() => (step < total - 1 ? setStep(step + 1) : finish())}>
                {step === total - 1 ? t('tour.done') : t('tour.next')}
                {step < total - 1 && <ArrowRight />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
