import { forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, initials, toneFor } from '@/lib/utils'
import { BrandLogo } from '@/platform/logos'

/* ---------------- Carte ---------------- */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-card relative', className)} {...props} />
}

/** En-tête de carte (image 02) : pastille-icône, titre, action à droite. */
export function CardHeader({ icon, title, subtitle, action, className }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {icon && <IconChip>{icon}</IconChip>}
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-subtle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function IconChip({ children, tone = 'accent', className }: { children: ReactNode; tone?: 'accent' | 'blue' | 'success' | 'warning' | 'danger' | 'neutral'; className?: string }) {
  const tones = {
    accent: 'bg-accent-soft text-accent-text',
    blue: 'bg-blue-soft text-blue-text',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    neutral: 'bg-surface-3 text-muted',
  }
  return <span className={cn('grid size-8 shrink-0 place-items-center rounded-[8px] [&_svg]:size-[17px]', tones[tone], className)}>{children}</span>
}

/* ---------------- Badges ---------------- */

const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap font-medium [&_svg]:size-3', {
  variants: {
    tone: {
      neutral: 'bg-surface-3 text-muted',
      accent: 'bg-accent-soft text-accent-text',
      blue: 'bg-blue-soft text-blue-text',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
      rose: 'bg-rose text-pastel-fg',
      sky: 'bg-sky text-pastel-fg',
      amber: 'bg-amber text-pastel-fg',
      lavender: 'bg-lavender text-pastel-fg',
      mint: 'bg-mint text-pastel-fg',
      outline: 'border border-line-strong text-muted',
      solid: 'bg-accent-strong text-on-accent',
    },
    size: {
      sm: 'h-[18px] rounded-[4px] px-1.5 text-[11px]',
      md: 'h-[22px] rounded-[6px] px-2 text-xs',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
})

export function Badge({ className, tone, size, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

/** Pastille corail de compteur (image 01). Texte sombre pour le contraste AA. */
export function CountDot({ count, className }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span className={cn('grid h-4 min-w-4 place-items-center rounded-full bg-badge px-1 text-[11px] font-semibold leading-none text-badge-fg tabular', className)}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** Étiquette de technologie. */
export function TechTag({ label, className, active, onClick }: { label: string; className?: string; active?: boolean; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'span'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-[6px] border px-2 text-[12px] font-medium transition-colors',
        active ? 'border-transparent bg-accent-strong text-on-accent' : 'border-line bg-surface-2 text-muted',
        onClick && !active && 'hover:text-fg hover:bg-[color-mix(in_oklab,var(--surface-3),var(--text)_8%)]',
        className,
      )}
    >
      {!active && <BrandLogo name={label} size={12} />}
      {label}
    </Comp>
  )
}

/* ---------------- Avatar ---------------- */

export function Avatar({ name, src, size = 32, className, ring }: { name: string; src?: string | null; size?: number; className?: string; ring?: boolean }) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) }
  return src ? (
    <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" style={style} className={cn('shrink-0 rounded-full object-cover bg-surface-3', ring && 'ring-2 ring-surface-2', className)} />
  ) : (
    <span aria-hidden style={style} className={cn('grid shrink-0 place-items-center rounded-full font-semibold text-pastel-fg', toneFor(name), ring && 'ring-2 ring-surface-2', className)}>
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ people, max = 4, size = 24 }: { people: { id: string; displayName: string; avatarUrl: string | null }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.displayName} src={p.avatarUrl} size={size} ring />
      ))}
      {rest > 0 && (
        <span style={{ width: size, height: size }} className="grid place-items-center rounded-full bg-surface-3 text-[10px] font-semibold text-muted ring-2 ring-surface-2">
          +{rest}
        </span>
      )}
    </div>
  )
}

/* ---------------- Formulaires ---------------- */

const fieldBase =
  'w-full rounded-[14px] border border-line-strong bg-canvas text-fg placeholder:text-subtle transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-fg disabled:opacity-60 aria-[invalid=true]:border-danger'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, 'h-11 px-4 text-[15px] sm:h-10 sm:text-sm', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-24 resize-y px-3.5 py-2.5 text-[15px] leading-relaxed sm:text-sm', className)} {...props} />
})

export function Field({ label, htmlFor, hint, error, optional, children, className }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; error?: ReactNode; optional?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-[13px] font-medium text-fg">
        {label}
        {optional && <span className="text-xs font-normal text-subtle">{optional}</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

/* ---------------- Divers ---------------- */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong bg-surface-2 px-1 font-mono text-[10.5px] font-medium text-muted', className)}>{children}</kbd>
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />
}

export function SectionLabel({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <h3 className="label-caps">{children}</h3>
      {action}
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />
}

export function StatusDot({ tone, pulse, className }: { tone: 'success' | 'warning' | 'danger' | 'neutral' | 'accent'; pulse?: boolean; className?: string }) {
  const map = { success: 'bg-success text-success', warning: 'bg-warning text-warning', danger: 'bg-danger text-danger', neutral: 'bg-subtle text-subtle', accent: 'bg-accent text-accent' }
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', map[tone], pulse && 'animate-pulse-dot', className)} />
}
