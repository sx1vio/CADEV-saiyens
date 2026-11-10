import { useTranslation } from 'react-i18next';
import { formatNumber, useLang } from '@/i18n';
import { countryName } from '@/lib/geo';
import { cn } from '@/lib/utils';
import type { CountryMapStats } from '@/services';
import { AFRICA_SHAPES, MAP_VIEWBOX } from './shapes';

export type MapMetric = 'active' | 'xp';

type Row = CountryMapStats['countries'][number];

/** Valeur colorée d'un pays : devs actifs (ou inscrits si l'activité n'est pas mesurée), ou Proof XP. */
export const metricValue = (r: Row, metric: MapMetric): number =>
  metric === 'xp' ? r.xp : (r.activeDevs ?? r.devs);

/** 5 classes : 0 (aucun), puis quatre paliers relatifs au pays le mieux placé. */
export function bucket(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  return ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
}

// Palier 0 : la couleur des terres (--map-land), nettement visible sur le fond en clair comme en
// sombre ; les paliers suivants mélangent l'accent à cette couleur, jamais au fond de la page.
const FILL = [
  'fill-[var(--map-land)]',
  'fill-[color-mix(in_oklab,var(--accent)_38%,var(--map-land))]',
  'fill-[color-mix(in_oklab,var(--accent)_58%,var(--map-land))]',
  'fill-[color-mix(in_oklab,var(--accent)_80%,var(--map-land))]',
  'fill-accent',
] as const;

/**
 * D4 : carte SVG du continent (frontières Natural Earth simplifiées, aucune bibliothèque). Les
 * pays qui ont des données sont des boutons au clavier ; le tableau de la page reste l'alternative
 * complète pour les lecteurs d'écran.
 */
export function AfricaMap({
  stats,
  metric,
  selected,
  onSelect,
}: {
  stats: CountryMapStats;
  metric: MapMetric;
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const byCode = new Map(stats.countries.map((r) => [r.country, r]));
  const max = Math.max(0, ...stats.countries.map((r) => metricValue(r, metric)));
  const label = (code: string, r: Row | undefined) => {
    const name = countryName(code, lang);
    if (!r) return t('map.noDevs', { country: name });
    return metric === 'xp'
      ? t('map.labelXp', { country: name, xp: formatNumber(r.xp, lang) })
      : t('map.labelActive', { country: name, count: metricValue(r, metric) });
  };

  return (
    <svg
      viewBox={MAP_VIEWBOX}
      role="group"
      aria-label={t('map.aria')}
      className="h-auto w-full max-w-[640px]"
    >
      {AFRICA_SHAPES.map((s, i) => {
        if (!s.code) {
          return (
            <path
              key={`neutral-${i}`}
              d={s.d}
              aria-hidden
              className="fill-[var(--map-land-muted)] stroke-[var(--map-border)]"
              strokeWidth={0.8}
            />
          );
        }
        const code = s.code;
        const r = byCode.get(code);
        const level = r ? bucket(metricValue(r, metric), max) : 0;
        const interactive = Boolean(r);
        return (
          <path
            key={code}
            d={s.d}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? label(code, r) : undefined}
            aria-pressed={interactive ? selected === code : undefined}
            aria-hidden={interactive ? undefined : true}
            onClick={interactive ? () => onSelect(code) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(code);
                    }
                  }
                : undefined
            }
            className={cn(
              FILL[level],
              'stroke-[var(--map-border)] transition-[fill] outline-none',
              interactive && 'cursor-pointer hover:fill-accent-hover focus-visible:stroke-fg',
              selected === code && 'stroke-fg',
            )}
            strokeWidth={selected === code ? 2 : 0.8}
          >
            <title>{label(code, r)}</title>
          </path>
        );
      })}
    </svg>
  );
}

/** Légende des paliers, avec les bornes réelles du pays le mieux placé. */
export function MapLegend({ max, metric }: { max: number; metric: MapMetric }) {
  const { t } = useTranslation();
  const lang = useLang();
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted" aria-hidden>
      <span>{metric === 'xp' ? 'Proof XP' : t('map.activeDevs')}</span>
      <span className="flex items-center gap-1">
        {FILL.map((f, i) => (
          <svg key={f} viewBox="0 0 12 12" className="size-3">
            <rect width="12" height="12" rx="2" className={f} />
            {i === 0 && <title>0</title>}
          </svg>
        ))}
      </span>
      <span className="tabular">0 – {formatNumber(max, lang)}</span>
    </div>
  );
}
