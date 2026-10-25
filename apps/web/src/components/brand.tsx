import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Le symbole DevHub : chevrons « </> » liés par une barre en S, dégradé bleu → turquoise. */
export function BrandMark({
  size = 32,
  className,
  mono,
}: {
  size?: number;
  className?: string;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 100 80"
      width={size}
      height={(size * 80) / 100}
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0.75" x2="1" y2="0.25">
          <stop offset="0" stopColor="#0a6cff" />
          <stop offset="0.5" stopColor="#10b0f0" />
          <stop offset="1" stopColor="#20e2b4" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke={mono ? 'currentColor' : `url(#${id})`}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M35 21 12 40l17 14" strokeWidth="9" />
        <path d="M65 26l23 14-21 16" strokeWidth="9" />
        <path d="M19 65c10 7 21 4 25-8l10-34c4-11 15-14 25-7" strokeWidth="8" />
      </g>
    </svg>
  );
}

/** Logo complet : symbole + « DevHub » (« Hub » en turquoise, comme le symbole). */
export function BrandLogo({
  size = 32,
  onDark,
  className,
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark size={size} />
      <span
        className={cn('font-bold tracking-[-0.035em]', onDark ? 'text-white' : 'text-fg')}
        style={{ fontSize: size * 0.62 }}
      >
        Dev<span className={onDark ? 'text-[#5eead4]' : 'brand-hub'}>Hub</span>
      </span>
    </span>
  );
}
