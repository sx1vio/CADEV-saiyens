import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { EmptyState, ErrorState } from '@/components/djeli';
import { DevCard, PageHeader } from '@/components/domain';
import { useTags } from '@/components/TagPicker';
import { Button } from '@/components/ui/button';
import { Input, Skeleton } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { useLang } from '@/i18n';
import { COUNTRIES } from '@/lib/geo';
import { useQuery } from '@/lib/query';
import { api, type DiscoverFilters, type LookingFor } from '@/services';
import { Page } from './_layout';

/** D1 : recherche de devs, filtres combinables, état dans l'URL. */
export default function Discover() {
  const { t } = useTranslation();
  const lang = useLang();
  const [params, setParams] = useSearchParams();
  const { data: tags = [] } = useTags();

  const f: DiscoverFilters = {
    q: params.get('q') || undefined,
    tags: params.get('stack')
      ? [tags.find((x) => x.slug === params.get('stack'))?.id ?? '__none__']
      : undefined,
    country: params.get('country') || undefined,
    timezone: params.get('tz') === 'near' ? 'near' : undefined,
    availability: (params.get('avail') as DiscoverFilters['availability']) || undefined,
    lookingFor: (params.get('looking') as LookingFor) || undefined,
  };
  const key = `devs:${params.toString()}:${tags.length}`;
  const { data, error, refresh } = useQuery(tags.length ? key : null, () => api.discoverDevs(f));

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const active = [...params.keys()].length > 0;
  const selectCls =
    'h-11 rounded-full border border-line-strong bg-canvas px-4 text-sm text-fg sm:h-10';

  return (
    <Page wide>
      <PageHeader title={t('discover.title')} subtitle={t('discover.subtitle')} />

      <section
        className="mt-6 flex flex-col gap-3 rounded-[10px] bg-surface-1 p-3 sm:p-4"
        aria-label={t('common.search')}
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
            <Input
              type="search"
              defaultValue={params.get('q') ?? ''}
              onChange={(e) => set('q', e.target.value)}
              placeholder={t('discover.searchPlaceholder')}
              className="pl-10"
              aria-label={t('common.search')}
            />
          </div>
          <select
            value={params.get('stack') ?? ''}
            onChange={(e) => set('stack', e.target.value)}
            className={selectCls}
            aria-label={t('discover.stack')}
          >
            <option value="">
              {t('discover.stack')} · {t('discover.any')}
            </option>
            {tags.map((x) => (
              <option key={x.id} value={x.slug}>
                {x.label}
              </option>
            ))}
          </select>
          <select
            value={params.get('country') ?? ''}
            onChange={(e) => set('country', e.target.value)}
            className={selectCls}
            aria-label={t('discover.country')}
          >
            <option value="">{t('discover.allCountries')}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c[lang]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="hidden size-4 text-subtle sm:block" />
          <Segmented
            label={t('discover.availability')}
            size="sm"
            value={params.get('avail') ?? ''}
            onChange={(v) => set('avail', v)}
            items={[
              { value: '', label: t('discover.anyAvail') },
              { value: 'now', label: t('discover.now') },
              { value: 'today', label: t('discover.today') },
              { value: 'mission', label: t('discover.mission') },
            ]}
          />
          <Segmented
            label={t('discover.timezone')}
            size="sm"
            value={params.get('tz') ?? ''}
            onChange={(v) => set('tz', v)}
            items={[
              { value: '', label: t('discover.any') },
              { value: 'near', label: t('discover.near') },
            ]}
          />
          <select
            value={params.get('looking') ?? ''}
            onChange={(e) => set('looking', e.target.value)}
            className={`${selectCls} h-9 sm:h-9`}
            aria-label={t('discover.looking')}
          >
            <option value="">
              {t('discover.looking')} · {t('discover.any')}
            </option>
            {(['help', 'helping', 'project', 'team'] as LookingFor[]).map((l) => (
              <option key={l} value={l}>
                {t('discover.looking')} {t(`discover.lookingFor.${l}`)}
              </option>
            ))}
          </select>
          {active && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw />}
              onClick={() => setParams({}, { replace: true })}
            >
              {t('discover.reset')}
            </Button>
          )}
        </div>
      </section>

      <div className="mt-6">
        {error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-60 rounded-[10px]" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title={t('discover.empty')}
            action={
              <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                {t('discover.reset')}
              </Button>
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {t('discover.results', { count: data.length })}
            </p>
            <div className="dh-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.map((d) => (
                <DevCard key={d.id} dev={d} />
              ))}
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
