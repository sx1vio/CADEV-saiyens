import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none',
    'transition-[background-color,box-shadow,transform,color,opacity] duration-150 ease-out',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** Action primaire : une seule par écran */
        primary: 'bg-accent-strong text-on-accent shadow-accent hover:bg-accent',
        /** Réservé au hero et au CTA principal */
        hero: 'bg-hero text-on-accent shadow-accent hover:brightness-110',
        /** Bouton sombre contrasté sur bannière violette (image 01) */
        contrast: 'bg-contrast text-on-hero shadow-md hover:bg-contrast-hover',
        secondary: 'surface-raised text-fg hover:bg-[color-mix(in_oklab,var(--surface-3),var(--text)_6%)]',
        ghost: 'text-muted hover:text-fg hover:bg-surface-3',
        /** Pilule fantôme « View all » (image 02) */
        pill: 'rounded-full border border-line-strong text-muted hover:text-fg hover:bg-surface-3',
        danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-canvas',
        success: 'bg-success-soft text-success hover:bg-success hover:text-canvas',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-lg [&_svg]:size-3.5',
        sm: 'h-9 px-3 text-sm rounded-[10px]',
        md: 'h-10 px-4 text-sm rounded-[12px]',
        lg: 'h-12 px-5 text-[15px] rounded-[14px]',
        icon: 'size-10 rounded-[12px]',
        'icon-sm': 'size-8 rounded-[10px]',
      },
    },
    compoundVariants: [{ variant: 'pill', class: 'rounded-full' }],
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

type Variants = VariantProps<typeof buttonVariants>

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Variants {
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, icon, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
})

export function ButtonLink({ className, variant, size, icon, children, ...props }: LinkProps & Variants & { icon?: ReactNode }) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </Link>
  )
}

/** Indicateur discret dans un bouton (jamais en plein écran). */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('size-4 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
