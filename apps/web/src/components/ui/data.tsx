import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { formatDate, useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import type { SkillLevel } from '@/services';

/**
 * Barre de score bicolore G + P (PR7) : on comprend en une seconde que le score vient
 * de deux sources vérifiables, et que l'entraide pèse plus que le code stocké.
 */
export function ScoreBar({
  g,
  p,
  className,
  height = 8,
}: {
  g: number;
  p: number;
  className?: string;
  height?: number;
}) {
  const gp = Math.min(40, g);
  const pp = Math.min(60, p);
  const total = Math.min(100, gp + pp);
  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-surface-3', className)}
      style={{ height }}
      role="img"
      aria-label={`G ${gp} + P ${pp} = ${total}/100`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-l-full bg-score-g transition-[width] duration-500 ease-out"
        style={{ width: `${gp}%` }}
      />
      <div
        className="absolute inset-y-0 rounded-r-full bg-score-p transition-[left,width] duration-500 ease-out"
        style={{ left: `${gp}%`, width: `${Math.min(pp, 100 - gp)}%` }}
      />
    </div>
  );
}

export function LevelBadge({ level, score }: { level: SkillLevel; score: number }) {
  const { t } = useTranslation();
  const tones: Record<SkillLevel, string> = {
    beginner: 'text-muted',
    confirmed: 'text-blue-text',
    advanced: 'text-accent-text',
    expert: 'text-success',
  };
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[15px] font-semibold tabular text-fg">{score}</span>
      <span className={cn('text-xs font-medium', tones[level])}>
        {t(`passport.level.${level}`)}
      </span>
    </span>
  );
}

/**
 * Carte de chaleur de l'entraide (PR8), dans le style de l'image 02 :
 * intensités de l'accent, 26 semaines, une case par jour.
 */
export function Heatmap({
  days,
  className,
}: {
  days: { date: string; count: number }[];
  className?: string;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const level = (c: number) => (c === 0 ? 0 : c === 1 ? 1 : c <= 2 ? 2 : c <= 4 ? 3 : 4);
  const shades = [
    'bg-surface-3',
    'bg-[color-mix(in_oklab,var(--accent),transparent_70%)]',
    'bg-[color-mix(in_oklab,var(--accent),transparent_45%)]',
    'bg-[color-mix(in_oklab,var(--accent),transparent_20%)]',
    'bg-accent-hover',
  ];
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="no-scrollbar overflow-x-auto">
        <div
          className="grid w-max grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: 'repeat(7, 11px)' }}
        >
          {weeks.flat().map((d) => (
            <span
              key={d.date}
              title={t('passport.heatmapCell', {
                count: d.count,
                date: formatDate(d.date, lang, { day: 'numeric', month: 'short' }),
              })}
              className={cn('size-[11px] rounded-[3px]', shades[level(d.count)])}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[11px] text-subtle">
        {t('passport.heatmapLegend')}
        {shades.map((s) => (
          <span key={s} className={cn('size-[10px] rounded-[3px]', s)} />
        ))}
        {t('passport.heatmapMore')}
      </div>
    </div>
  );
}

/** Grand chiffre avec libellé et delta coloré (image 02). */
export function StatTile({
  value,
  label,
  delta,
  icon,
  className,
  hint,
}: {
  value: ReactNode;
  label: ReactNode;
  delta?: { value: string; positive: boolean } | null;
  icon?: ReactNode;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {icon && <div className="mb-2">{icon}</div>}
      <div className="text-[28px] font-semibold leading-none tracking-tight tabular text-fg sm:text-[32px]">
        {value}
      </div>
      <div className="text-[13px] text-muted">{label}</div>
      {delta && (
        <div
          className={cn('text-xs font-semibold', delta.positive ? 'text-success' : 'text-danger')}
        >
          {delta.value}
        </div>
      )}
      {hint && <div className="text-[11.5px] text-subtle">{hint}</div>}
    </div>
  );
}

/** Mini graphique en barres doubles (posées / résolues), sans librairie. */
export function DualBars({
  data,
  labels,
}: {
  data: { label: string; a: number; b: number }[];
  labels: [string, string];
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-40 items-end gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col justify-end gap-1.5">
            <div className="flex h-full items-end justify-center gap-1">
              <div
                className="w-full max-w-4 rounded-t-[4px] bg-blue transition-[height] duration-500"
                style={{ height: `${(d.a / max) * 100}%` }}
                title={`${labels[0]} : ${d.a}`}
              />
              <div
                className="w-full max-w-4 rounded-t-[4px] bg-accent transition-[height] duration-500"
                style={{ height: `${(d.b / max) * 100}%` }}
                title={`${labels[1]} : ${d.b}`}
              />
            </div>
            <span className="text-center text-[10.5px] text-subtle tabular">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-blue" />
          {labels[0]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-accent" />
          {labels[1]}
        </span>
      </div>
    </div>
  );
}
