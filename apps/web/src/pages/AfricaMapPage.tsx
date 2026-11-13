import { Info, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ErrorState } from '@/components/djeli';
import { PageHeader } from '@/components/domain';
import {
  AfricaMap,
  MapLegend,
  type MapMetric,
  metricValue,
} from '@/components/africa-map/AfricaMap';
import { AFRICA_SHAPES } from '@/components/africa-map/shapes';
import { ButtonLink } from '@/components/ui/button';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { formatNumber, useLang } from '@/i18n';
import { countryName } from '@/lib/geo';
import { useQuery } from '@/lib/query';
import { api } from '@/services';
import { Page } from './_layout';

const AFRICAN = new Set(AFRICA_SHAPES.flatMap((s) => (s.code ? [s.code] : [])));

/** D4 : carte interactive de l'Afrique, devs actifs ou Proof XP par pays, avec son tableau. */
export default function AfricaMapPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, error, refresh } = useQuery('leaderboard:map', () => api.leaderboardMap());
  const [metric, setMetric] = useState<MapMetric>('active');
  const [selected, setSelected] = useState<string | null>(null);

  const rows = [...(data?.countries ?? [])].sort(
    (a, b) => metricValue(b, metric) - metricValue(a, metric) || b.xp - a.xp,
  );
  const max = Math.max(0, ...rows.map((r) => metricValue(r, metric)));
  const current = rows.find((r) => r.country === selected) ?? null;
  const fmt = (n: number | null) => (n === null ? '—' : formatNumber(n, lang));

  return (
    <Page>
      <PageHeader title={t('map.title')} subtitle={t('map.subtitle')} />

      {error ? (
        <ErrorState error={error} onRetry={refresh} className="mt-6" />
      ) : !data ? (
        <Skeleton className="mt-6 aspect-[1000/822] w-full max-w-[640px] rounded-[10px]" />
      ) : (
        <>
          {data.source === 'demo' && (
            <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-surface-1 p-3.5 text-[13px] text-muted">
              <Info className="mt-0.5 size-4 shrink-0" />
              {t('map.demoData')}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Segmented<MapMetric>
              label={t('map.metric')}
              size="sm"
              value={metric}
              onChange={setMetric}
              items={[
                { value: 'active', label: t('map.activeDevs'), icon: <Users /> },
                { value: 'xp', label: 'Proof XP', icon: <Trophy /> },
              ]}
            />
            <MapLegend max={max} metric={metric} />
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <AfricaMap stats={data} metric={metric} selected={selected} onSelect={setSelected} />
            <Card className="flex flex-col gap-3 self-start p-5" aria-live="polite">
              {current ? (
                <>
                  <h2 className="text-[17px] font-bold text-fg">
                    {countryName(current.country, lang)}
                  </h2>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label={t('map.devs')} value={fmt(current.devs)} />
                    <Stat label={t('map.activeDevs')} value={fmt(current.activeDevs)} />
                    <Stat label={t('map.unblocked')} value={fmt(current.unblocked)} />
                    <Stat label="Proof XP" value={fmt(current.xp)} />
                  </dl>
                  <ButtonLink
                    to={`/decouvrir?country=${current.country}`}
                    variant="primary"
                    size="sm"
                    icon={<Users />}
                  >
                    {t('map.seeDevs')}
                  </ButtonLink>
                </>
              ) : (
                <p className="text-sm text-muted">{t('map.pick')}</p>
              )}
            </Card>
          </div>

          <p className="mt-4 text-xs text-subtle">
            {t('map.method', { days: data.activeWindowDays })}
            {data.unlocatedDevs > 0 && <> {t('map.unlocated', { count: data.unlocatedDevs })}</>}
            {data.demo.devs > 0 && (
              <> {t('map.demoApart', { count: data.demo.devs, xp: fmt(data.demo.xp) })}</>
            )}{' '}
            <Link to="/regles" className="font-medium text-accent-text hover:underline">
              {t('leaderboard.how')}
            </Link>
            {' · '}
            <Link to="/impact" className="font-medium text-accent-text hover:underline">
              {t('map.seeImpact')}
            </Link>
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="mb-3 text-left text-[17px] font-bold text-fg">
                {t('map.tableCaption')}
              </caption>
              <thead className="text-xs text-subtle">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t('leaderboard.country')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {t('map.devs')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {t('map.activeDevs')}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {t('map.unblocked')}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Proof XP
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted">
                      {t('map.empty')}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.country} className="border-t border-line">
                      <th scope="row" className="py-2 pr-3 font-medium text-fg">
                        <Link
                          to={`/decouvrir?country=${r.country}`}
                          className="hover:text-accent-text hover:underline"
                        >
                          {countryName(r.country, lang)}
                        </Link>
                        {!AFRICAN.has(r.country) && (
                          <span className="ml-2 text-xs font-normal text-subtle">
                            {t('map.outsideAfrica')}
                          </span>
                        )}
                      </th>
                      <td className="py-2 pr-3 text-right tabular">{fmt(r.devs)}</td>
                      <td className="py-2 pr-3 text-right tabular">{fmt(r.activeDevs)}</td>
                      <td className="py-2 pr-3 text-right tabular">{fmt(r.unblocked)}</td>
                      <td className="py-2 text-right tabular">{fmt(r.xp)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-[20px] font-semibold tabular text-fg">{value}</dd>
    </div>
  );
}
