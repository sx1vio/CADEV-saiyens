import { AlertTriangle, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import celebrate from '@/assets/djeli/celebrate.webp'
import laptop from '@/assets/djeli/laptop.webp'
import point from '@/assets/djeli/point.webp'
import wave from '@/assets/djeli/wave.webp'
import { errorKey } from '@/i18n'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

export type DjeliPose = 'wave' | 'point' | 'celebrate' | 'laptop'
const POSES: Record<DjeliPose, string> = { wave, point, celebrate, laptop }

/** Djeli, la mascotte : rendu 3D, halo doux, flottement léger (coupé si reduced-motion). */
export function Djeli({ pose = 'wave', size = 120, float, className, eager }: { pose?: DjeliPose; size?: number; float?: boolean; className?: string; eager?: boolean }) {
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <span aria-hidden className="absolute inset-[12%] rounded-full bg-accent opacity-25 blur-2xl" />
      <img src={POSES[pose]} alt="" width={size} height={size} draggable={false} decoding="async" loading={eager ? "eager" : "lazy"} className={cn('relative h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]', float && 'animate-float')} />
    </span>
  )
}

/** État vide illustré, toujours avec une action. */
export function EmptyState({ title, text, action, pose = 'laptop', className, compact }: { title: ReactNode; text?: ReactNode; action?: ReactNode; pose?: DjeliPose; className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-line-strong px-6 text-center', compact ? 'py-6' : 'py-10', className)}>
      <Djeli pose={pose} size={compact ? 72 : 104} />
      <div className="max-w-sm">
        <p className="font-semibold text-fg">{title}</p>
        {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { t } = useTranslation()
  const code = (error as { code?: string })?.code
  const msg = code && t(errorKey(code), { defaultValue: '' }) ? t(errorKey(code)) : t('errors.generic')
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-[20px] border border-line bg-danger-soft/40 px-6 py-8 text-center', className)}>
      <AlertTriangle className="size-6 text-danger" />
      <p className="text-sm text-fg">{msg}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" icon={<RotateCw />} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
