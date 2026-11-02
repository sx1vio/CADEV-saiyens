import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/** Décalage UTC d'un fuseau à cette date, au format « UTC+1 » ou « UTC−3:30 ». */
function offsetLabel(tz: string, at: Date): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    if (!part || part === 'GMT') return 'UTC';
    return part.replace('GMT', 'UTC').replace('-', '−');
  } catch {
    return '';
  }
}

/** Minutes de décalage, pour trier les fuseaux d'une même région d'ouest en est. */
function offsetMinutes(label: string): number {
  const m = /UTC([+−])(\d+)(?::(\d+))?/.exec(label);
  if (!m) return 0;
  const v = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === '−' ? -v : v;
}

const REGION_LABEL: Record<string, string> = {
  Africa: 'Afrique',
  Indian: 'Océan Indien',
  Europe: 'Europe',
  America: 'Amériques',
  Asia: 'Asie',
  Atlantic: 'Atlantique',
  Australia: 'Océanie',
  Pacific: 'Pacifique',
  Antarctica: 'Antarctique',
  Arctic: 'Arctique',
};
const REGION_ORDER = [
  'Africa',
  'Indian',
  'Europe',
  'America',
  'Atlantic',
  'Asia',
  'Australia',
  'Pacific',
];

const FALLBACK = [
  'Africa/Abidjan',
  'Africa/Accra',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Dakar',
  'Africa/Douala',
  'Africa/Johannesburg',
  'Africa/Kigali',
  'Africa/Kinshasa',
  'Africa/Lagos',
  'Africa/Lome',
  'Africa/Nairobi',
  'Africa/Porto-Novo',
  'Africa/Tunis',
  'Europe/Paris',
  'Europe/London',
  'America/New_York',
  'America/Montreal',
];

/** Nom lisible : « Porto-Novo », « Port Louis », « Indiana / Indianapolis ». */
const cityOf = (tz: string) => tz.split('/').slice(1).join(' / ').replaceAll('_', ' ');

/** Liste des fuseaux horaires IANA groupés par région (Afrique en premier), avec le décalage actuel. */
export function TimezoneSelect({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (tz: string) => void;
  className?: string;
}) {
  const groups = useMemo(() => {
    const now = new Date();
    let all: string[];
    try {
      all = Intl.supportedValuesOf('timeZone');
    } catch {
      all = FALLBACK;
    }
    const byRegion = new Map<string, { tz: string; label: string; off: number }[]>();
    for (const tz of all) {
      const region = tz.split('/')[0]!;
      if (!REGION_LABEL[region] || !tz.includes('/')) continue;
      const off = offsetLabel(tz, now);
      const list = byRegion.get(region) ?? [];
      list.push({ tz, label: `${cityOf(tz)} (${off})`, off: offsetMinutes(off) });
      byRegion.set(region, list);
    }
    return [...byRegion.entries()]
      .sort(([a], [b]) => (REGION_ORDER.indexOf(a) + 1 || 99) - (REGION_ORDER.indexOf(b) + 1 || 99))
      .map(([region, list]) => ({
        region,
        label: REGION_LABEL[region]!,
        items: list.sort((a, b) => a.off - b.off || a.label.localeCompare(b.label, 'fr')),
      }));
  }, []);

  const known = groups.some((g) => g.items.some((i) => i.tz === value));

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-11 w-full rounded-[12px] border border-line bg-inset px-3 text-[15px] text-fg',
        className,
      )}
    >
      {!known && <option value={value}>{value || 'Choisis ton fuseau'}</option>}
      {groups.map((g) => (
        <optgroup key={g.region} label={g.label}>
          {g.items.map((i) => (
            <option key={i.tz} value={i.tz}>
              {i.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
