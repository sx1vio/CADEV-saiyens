import { CheckCircle2, Clock3, Globe2, GitPullRequestArrow, Languages, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/components/djeli';
import { DemoBadge, PageHeader } from '@/components/domain';
import { DualBars } from '@/components/ui/data';
import { Card, CardHeader, IconChip, Skeleton } from '@/components/ui/primitives';
import { formatDate, formatNumber, useLang } from '@/i18n';
import { useQuery } from '@/lib/query';
import { api } from '@/services';
import { Page } from './_layout';

/** Y2 (+ Y9) : chiffres calculés sur les données, définitions affichées. */
export default function Impact() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, error, refresh } = useQuery('impact', () => api.getImpact());

  const tiles = data
    ? [
        {
          icon: <Users />,
          tone: 'accent' as const,
          value: formatNumber(data.devs, lang),
          label: t('impact.devs'),
        },
        {
          icon: <CheckCircle2 />,
          tone: 'success' as const,
          value: formatNumber(data.questionsResolved, lang),
          label: t('impact.resolved'),
        },
        {
          icon: <Clock3 />,
          tone: 'blue' as const,
          value:
            data.medianFirstResponseMinutes !== null
              ? t('impact.minutes', { count: data.medianFirstResponseMinutes })
              : '—',
          label: t('impact.median'),
          hint: t('impact.medianDef'),
        },
        {
          icon: <Globe2 />,
          tone: 'warning' as const,
          value: data.countries,
          label: t('impact.countries'),
        },
        {
          icon: <GitPullRequestArrow />,
          tone: 'success' as const,
          value: data.verifiedContributions,
          label: t('impact.verified'),
        },
        {
          icon: <Languages />,
          tone: 'accent' as const,
          value: data.crossLanguage,
          label: t('impact.crossLang'),
        },
      ]
    : [];

  return (
    <Page>
      <PageHeader title={t('impact.title')} subtitle={t('impact.subtitle')} />
      {data?.source === 'local' && (
        <p className="mt-3 flex items-center gap-2 text-xs text-subtle">
          <DemoBadge /> {t('common.demoDataHint')}
        </p>
      )}
      {error ? (
        <ErrorState error={error} onRetry={refresh} className="mt-6" />
      ) : !data ? (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[10px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="dh-stagger mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {tiles.map((x) => (
              <Card key={x.label} className="flex flex-col gap-3 p-4 sm:p-5">
                <IconChip tone={x.tone}>{x.icon}</IconChip>
                <div>
                  <p className="text-[28px] font-semibold leading-none tracking-tight tabular text-fg sm:text-[34px]">
                    {x.value}
                  </p>
                  <p className="mt-1.5 text-[13px] text-muted">{x.label}</p>
                  {x.hint && (
                    <p className="mt-1 text-[11.5px] leading-snug text-subtle">{x.hint}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {data.weekly.length > 0 && (
            <Card className="mt-4 p-5 sm:p-6">
              <CardHeader title={t('impact.weekly')} />
              <div className="mt-5">
                <DualBars
                  data={data.weekly.map((w) => ({
                    label: formatDate(w.week, lang, { day: 'numeric', month: 'short' }),
                    a: w.asked,
                    b: w.resolved,
                  }))}
                  labels={[t('impact.asked'), t('impact.resolvedSeries')]}
                />
              </div>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
