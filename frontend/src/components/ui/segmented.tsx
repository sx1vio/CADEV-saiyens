import { LazyMotion, m } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CountDot } from './primitives'

export interface SegmentItem<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  count?: number
}

/**
 * Onglets façon Discord : texte sur fond transparent, l'onglet actif est un aplat
 * plus clair qui glisse d'un onglet à l'autre. `glow` est conservé pour compatibilité, sans effet.
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  size = 'md',
  className,
  label,
}: {
  items: SegmentItem<T>[]
  value: T
  onChange: (v: T) => void
  glow?: boolean
  size?: 'sm' | 'md'
  className?: string
  label: string
}) {
  const id = useId()
  return (
    <LazyMotion features={loadMotion} strict>
    <div
      role="tablist"
      aria-label={label}
      className={cn('no-scrollbar inline-flex max-w-full items-center gap-2 overflow-x-auto', className)}
      onKeyDown={(e) => {
        const i = items.findIndex((it) => it.value === value)
        if (e.key === 'ArrowRight') onChange(items[(i + 1) % items.length].value)
        if (e.key === 'ArrowLeft') onChange(items[(i - 1 + items.length) % items.length].value)
      }}
    >
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.value)}
            className={cn(
              'relative isolate inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium transition-colors duration-150',
              size === 'sm' ? 'h-8 px-3.5 text-[12.5px]' : 'h-9 px-4 text-[13px]',
              active ? 'text-canvas' : 'bg-surface-1 text-fg hover:bg-surface-2',
              '[&_svg]:size-4',
            )}
          >
            {active && (
              <m.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-full bg-fg"
                transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }}
              />
            )}
            {it.icon && <span className="opacity-80">{it.icon}</span>}
            {it.label}
            {!!it.count && <CountDot count={it.count} className="h-[18px] min-w-[18px] text-[10px]" />}
          </button>
        )
      })}
    </div>
    </LazyMotion>
  )
}

/** Fonctionnalités d'animation chargées à la première utilisation seulement. */
let motionFeatures: Promise<typeof import('@/app/motion-features').default> | null = null
const loadMotion = () => (motionFeatures ??= import('@/app/motion-features').then((x) => x.default))
