import type { ReactNode } from 'react';

export const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    : 'jamais';

export const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 30 * 86400) return `il y a ${Math.floor(s / 86400)} j`;
  return when(iso);
};

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="text-[22px] font-bold">{title}</h1>
      {children && <p className="mt-1 max-w-2xl text-[14px] text-muted">{children}</p>}
    </header>
  );
}

export function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { id: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
            value === o.id
              ? 'bg-ink text-white'
              : 'bg-panel text-muted ring-1 ring-line hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({
  tone = 'muted',
  children,
}: {
  tone?: 'good' | 'warn' | 'bad' | 'brand' | 'muted';
  children: ReactNode;
}) {
  const t = {
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    brand: 'bg-brand-soft text-brand',
    muted: 'bg-page text-muted ring-1 ring-line',
  }[tone];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${t}`}>{children}</span>
  );
}

export function Empty({ children = 'Rien à afficher.' }: { children?: ReactNode }) {
  return (
    <p className="rounded-xl border border-line bg-panel px-4 py-8 text-center text-muted">
      {children}
    </p>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      className="field max-w-md"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  );
}
