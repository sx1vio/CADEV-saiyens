import {
  Award,
  Bot,
  Briefcase,
  Code2,
  Container,
  Database,
  GitFork,
  Globe,
  LayoutDashboard,
  Rocket,
  Server,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { relativeTime, useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import { COMMUNITIES, GENERAL_COMMUNITY } from './data/feed';
import { BrandLogo, logoFor } from './logos';
import type { Template } from './types';

export const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  globe: Globe,
  smartphone: Smartphone,
  server: Server,
  container: Container,
  'git-fork': GitFork,
  briefcase: Briefcase,
  wallet: Wallet,
  database: Database,
  rocket: Rocket,
  bot: Bot,
  'layout-dashboard': LayoutDashboard,
  users: Users,
};

export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} M`;
  if (n >= 1000)
    return `${(n / 1000)
      .toFixed(n >= 10_000 ? 0 : 1)
      .replace('.0', '')
      .replace('.', ',')} k`;
  return String(n);
}

export function Ago({ iso, className }: { iso: string; className?: string }) {
  const lang = useLang();
  return (
    <time dateTime={iso} className={className}>
      {relativeTime(iso, lang)}
    </time>
  );
}

/* ---------------- Personnes ---------------- */

export function communityOf(slug: string) {
  if (slug === GENERAL_COMMUNITY.slug) return GENERAL_COMMUNITY;
  return COMMUNITIES.find((c) => c.slug === slug) ?? COMMUNITIES[0];
}

export function CommunityIcon({
  slug,
  size = 24,
  className,
}: {
  slug: string;
  size?: number;
  className?: string;
}) {
  const c = communityOf(slug);
  const Icon = ICONS[c.icon] ?? Sparkles;
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full text-white', className)}
      style={{ width: size, height: size, background: c.color }}
    >
      <Icon style={{ width: size * 0.54, height: size * 0.54, strokeWidth: 2 }} />
    </span>
  );
}

/* ---------------- Votes (Reddit) ---------------- */

export const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Rust: '#dea584',
  Python: '#3572a5',
  Dart: '#00b4ab',
  Go: '#00add8',
  PHP: '#4f5d95',
  Kotlin: '#a97bff',
};

export function TemplatePreview({ tpl, className }: { tpl: Template; className?: string }) {
  const { bg, accent, layout } = tpl.preview;
  const bar = (w: string, o = 0.18, h = 6) => (
    <span
      className="block rounded-full"
      style={{ width: w, height: h, background: `rgba(255,255,255,${o})` }}
    />
  );
  return (
    <div
      className={cn(
        'relative aspect-[16/10] overflow-hidden rounded-[10px] border border-line',
        className,
      )}
      style={{ background: bg }}
    >
      <div
        className="flex h-5 items-center gap-1 px-2"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <span className="size-1.5 rounded-full bg-[#ff5f57]" />
        <span className="size-1.5 rounded-full bg-[#febc2e]" />
        <span className="size-1.5 rounded-full bg-[#28c840]" />
      </div>
      {layout === 'hero' && (
        <div className="flex h-[calc(100%-20px)] flex-col items-center justify-center gap-2 px-6">
          {bar('55%', 0.85, 10)}
          {bar('40%', 0.35)}
          <span className="mt-2 block h-4 w-20 rounded-full" style={{ background: accent }} />
          <div className="mt-3 grid w-full grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-8 rounded-[6px]"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              />
            ))}
          </div>
        </div>
      )}
      {layout === 'dashboard' && (
        <div className="flex h-[calc(100%-20px)]">
          <div
            className="flex w-[22%] flex-col gap-2 p-2"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i}>{bar(i === 1 ? '80%' : '65%', i === 1 ? 0.6 : 0.18, 5)}</span>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2.5">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-8 rounded-[6px]"
                  style={{ background: i === 0 ? accent : 'rgba(255,255,255,0.07)' }}
                />
              ))}
            </div>
            <div
              className="flex flex-1 items-end gap-1 rounded-[6px] p-2"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <span
                  key={i}
                  className="block flex-1 rounded-t-[2px]"
                  style={{
                    height: `${h}%`,
                    background: i === 5 ? accent : 'rgba(255,255,255,0.18)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {layout === 'shop' && (
        <div className="grid h-[calc(100%-20px)] grid-cols-3 gap-2 p-2.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <span
                className="block flex-1 rounded-[6px]"
                style={{ background: i === 1 ? accent : 'rgba(255,255,255,0.08)' }}
              />
              {bar('70%', 0.3, 4)}
            </div>
          ))}
        </div>
      )}
      {layout === 'mobile' && (
        <div className="flex h-[calc(100%-20px)] items-center justify-center gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex h-[86%] w-[26%] flex-col gap-1.5 rounded-[10px] border p-1.5"
              style={{
                borderColor: 'rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <span
                className="block h-[30%] rounded-[6px]"
                style={{ background: i === 0 ? accent : 'rgba(255,255,255,0.1)' }}
              />
              {bar('80%', 0.3, 4)}
              {bar('60%', 0.18, 4)}
              {bar('70%', 0.18, 4)}
            </div>
          ))}
        </div>
      )}
      {(layout === 'blog' || layout === 'docs') && (
        <div className="flex h-[calc(100%-20px)] gap-3 p-3">
          {layout === 'docs' && (
            <div className="flex w-[24%] flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span key={i}>{bar('80%', 0.2, 4)}</span>
              ))}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            {bar('60%', 0.8, 8)}
            {bar('90%', 0.2, 4)}
            {bar('85%', 0.2, 4)}
            <span
              className="mt-1 block h-10 rounded-[6px] font-mono"
              style={{ background: 'rgba(0,0,0,0.35)', borderLeft: `3px solid ${accent}` }}
            />
            {bar('75%', 0.2, 4)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Mise en page commune ---------------- */

/** Rangée de filtres façon YouTube (puces défilantes). */
export function Chips<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('no-scrollbar flex gap-2 overflow-x-auto', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            'h-9 shrink-0 rounded-full px-4 text-[13px] font-medium transition-colors',
            value === it.id ? 'lg-tint' : 'lg-clear text-fg',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** En-tête de page (charte Drivery) : très grand titre gras à gauche, action en pilule à droite. */
export function ServiceHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  icon?: LucideIcon;
  color?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.02em] text-fg sm:text-[32px]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">{subtitle}</p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:pt-1.5">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Cube 3D (icône des cartes d'indicateurs) : trois faces d'une même couleur. */
export function Cube({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 2.5 21 7.3 12 12.1 3 7.3Z" fill={color} />
      <path d="M3 7.3 12 12.1V22L3 17.1Z" fill={color} style={{ filter: 'brightness(0.78)' }} />
      <path d="M21 7.3 12 12.1V22l9-4.9Z" fill={color} style={{ filter: 'brightness(0.6)' }} />
    </svg>
  );
}

/** Petite courbe (carte noire « earned ») tracée à partir de vraies valeurs. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values
    .map(
      (v, i) =>
        `${(i / Math.max(1, values.length - 1)) * 100},${36 - ((v - min) / Math.max(1, max - min)) * 32}`,
    )
    .join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${pts} 100,40`} fill="url(#spark)" />
      <polyline
        points={pts}
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Carte d'indicateur : libellé en minuscules, grand chiffre gras, variation verte. */
/**
 * Chiffre clé, compact et sans décor : libellé, valeur, note. Les anciennes options
 * (carte sombre, cube, courbe) sont acceptées mais ignorées (docs/front/design-system.md).
 */
export function StatCard({
  label,
  value,
  delta,
  note,
  to,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  note?: string;
  dark?: boolean;
  cube?: string;
  spark?: number[];
  to?: string;
}) {
  const body = (
    <>
      <span className="truncate text-[12.5px] text-muted first-letter:uppercase">{label}</span>
      <span className="mt-0.5 text-[22px] leading-tight font-semibold tracking-[-0.01em] text-fg tabular">
        {value}
      </span>
      {(delta || note) && (
        <span className="mt-0.5 truncate text-[12px] text-subtle">
          {delta && <span className="font-medium text-success">{delta} </span>}
          {note}
        </span>
      )}
    </>
  );
  const cls = cn(
    'flex min-w-0 flex-col rounded-[10px] border border-line px-4 py-3 transition-colors',
    to && 'hover:bg-surface-1',
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export const CUBE = {
  orange: '#ff9f1a',
  purple: '#2348d6',
  navy: '#1d4ed8',
  green: '#22c55e',
  blue: '#3b82f6',
  pink: '#ec4899',
} as const;

/** Petite carte latérale (colonne de droite façon Reddit). */
export function SideCard({
  title,
  children,
  action,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[10px] bg-surface-1 p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold tracking-[-0.02em] text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[4px] bg-surface-3 px-1 py-0.5 font-mono text-[0.88em] text-fg">
      {children}
    </code>
  );
}

export const SERVICE_COLORS = {
  feed: '#ff6b3d',
  help: '#f2575a',
  jobs: '#22a3ee',
  certs: '#f0b232',
  skills: '#3b5bdb',
  videos: '#e5333b',
  learn: '#3ccf8e',
  build: '#1f3fc4',
  templates: '#e879f9',
  projects: '#4f7cff',
  communities: '#fb923c',
} as const;

export { Code2 };

/** Badge de certification : écusson sobre, logo de la techno au centre (comme un badge vérifiable). */
export function CertBadge({
  color,
  logo,
  size = 56,
  earned = true,
  className,
}: {
  color: string;
  logo?: string;
  size?: number;
  earned?: boolean;
  className?: string;
}) {
  const id = `cb-${color.replace('#', '')}-${size}`;
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center',
        !earned && 'opacity-90',
        className,
      )}
      style={{ width: size, height: size * 1.1 }}
    >
      <svg viewBox="0 0 100 110" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.95" />
            <stop offset="1" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path
          d="M50 3 92 25v42c0 21-17 34-42 40C25 101 8 88 8 67V25Z"
          fill="#14161c"
          stroke={`url(#${id})`}
          strokeWidth="5"
        />
        <path
          d="M50 14 82 31v35c0 15-12 25-32 30-20-5-32-15-32-30V31Z"
          fill={color}
          fillOpacity="0.12"
        />
      </svg>
      <span className="relative text-white" style={{ marginTop: -size * 0.04 }}>
        {logo && logoFor(logo) ? (
          <BrandLogo name={logo} size={Math.round(size * 0.36)} />
        ) : (
          <Award style={{ width: size * 0.34, height: size * 0.34, color }} />
        )}
      </span>
    </span>
  );
}
