import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Kbd } from './primitives';

/* ---------------- Media query ---------------- */

export function useMedia(query: string) {
  const [match, setMatch] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

export const useIsMobile = () => !useMedia('(min-width: 640px)');

/* ---------------- Dialog qui devient bottom sheet sur mobile ---------------- */

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  side,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Force un panneau latéral à droite (desktop) */
  side?: 'right';
}) {
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dh-overlay fixed inset-0 z-50 bg-[var(--scrim)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            'dh-sheet fixed z-50 flex max-h-[92dvh] flex-col border border-line bg-surface-1 shadow-lg focus:outline-none',
            'inset-x-0 bottom-0 rounded-t-[24px] pb-safe',
            side === 'right'
              ? 'sm:inset-y-2 sm:right-2 sm:left-auto sm:bottom-2 sm:max-h-none sm:w-[420px] sm:rounded-[10px]'
              : cn(
                  'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[10px]',
                  widths[size],
                ),
          )}
          data-side={side ?? 'center'}
        >
          <div
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden"
            aria-hidden
          />
          <div className="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-fg">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {title}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="grid size-9 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-3 hover:text-fg"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5 sm:px-6">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ---------------- Tooltip ---------------- */

export function Tip({
  label,
  shortcut,
  children,
  side = 'top',
}: {
  label: ReactNode;
  shortcut?: string[];
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <TooltipPrimitive.Root delayDuration={350}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="dh-pop z-[60] flex items-center gap-2 rounded-[10px] border border-line bg-surface-3 px-2.5 py-1.5 text-xs font-medium text-fg shadow-md"
        >
          {label}
          {shortcut && (
            <span className="flex gap-0.5">
              {shortcut.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;

/* ---------------- Menu déroulant ---------------- */

export function DropMenu({
  trigger,
  children,
  align = 'end',
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align={align}
          sideOffset={8}
          className="dh-pop z-[60] min-w-56 rounded-[10px] bg-surface-1 p-1.5 shadow-lg"
        >
          {children}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function MenuItem({
  icon,
  children,
  onSelect,
  danger,
  hint,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  hint?: ReactNode;
}) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className={cn(
        'flex h-9 cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 text-sm outline-none select-none [&_svg]:size-4',
        danger
          ? 'text-danger data-[highlighted]:bg-danger-soft'
          : 'text-muted data-[highlighted]:bg-surface-3 data-[highlighted]:text-fg',
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {hint}
    </Menu.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="label-caps px-2.5 pt-2 pb-1">{children}</Menu.Label>;
}

export function MenuSeparator() {
  return <Menu.Separator className="my-1.5 h-px bg-line" />;
}
