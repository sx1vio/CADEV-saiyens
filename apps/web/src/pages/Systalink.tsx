import {
  CloudUpload,
  Database,
  HardDrive,
  Info,
  LifeBuoy,
  Rocket,
  Mail,
  RefreshCw,
  Server,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/components/djeli';
import { DeployToSystalink } from '@/components/systalink';
import { PageHeader } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Badge, Card, IconChip, Skeleton, StatusDot } from '@/components/ui/primitives';
import { relativeTime, useLang } from '@/i18n';
import { Link } from 'react-router';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api, type ServiceStatus, type StatusHistory } from '@/services';
import { Page } from './_layout';

const ICONS: Record<ServiceStatus['id'], typeof Server> = {
  vps: Server,
  database: Database,
  backup: CloudUpload,
  mail: Mail,
  storage: HardDrive,
  'client-db': Smartphone,
  'service-worker': Wifi,
};
const TONE = { up: 'success', degraded: 'warning', down: 'danger', pending: 'neutral' } as const;

/** Y1 : état des services hébergés, mesuré en direct, aucune valeur codée en dur. */
export default function Systalink() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, error, refresh, refreshing } = useQuery('status', () => api.getStatus());

  const group = (product: ServiceStatus['product']) =>
    (data?.services ?? []).filter((s) => s.product === product);

  return (
    <Page>
      <PageHeader
        title={t('systalink.title')}
        subtitle={t('systalink.subtitle')}
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => void refresh()}
          >
            {t('systalink.refresh')}
          </Button>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={refresh} className="mt-6" />
      ) : !data ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[10px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card className="p-5 sm:col-span-2">
              <p className="text-[13px] text-muted">{t('systalink.lastBackup')}</p>
              <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-fg">
                {data.lastBackupAt ? relativeTime(data.lastBackupAt, lang) : '—'}
              </p>
              <p className="mt-2 text-xs text-subtle">
                {t('systalink.host')} · <span className="font-mono">{data.region}</span>
              </p>
            </Card>
            <Card className="flex flex-col justify-between p-5">
              <p className="text-[13px] text-muted">{t('systalink.systalinkProducts')}</p>
              <p className="text-[28px] font-semibold leading-none tracking-tight tabular text-fg">
                {group('systalink').filter((s) => s.status === 'up').length}/
                {group('systalink').length}
              </p>
              <StatusDot
                tone={group('systalink').some((s) => s.status === 'down') ? 'danger' : 'success'}
                pulse
              />
            </Card>
          </div>

          {data.source === 'local' && (
            <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-surface-1 p-3.5 text-[13px] text-muted">
              <Info className="mt-0.5 size-4 shrink-0" />
              {t('systalink.localNote')}
            </p>
          )}

          {(['systalink', 'client'] as const).map((product) => (
            <section key={product} className="mt-6">
              <h2 className="label-caps mb-3">
                {product === 'systalink'
                  ? t('systalink.systalinkProducts')
                  : t('systalink.clientSide')}
              </h2>
              <div className="dh-stagger grid gap-3 sm:grid-cols-2">
                {group(product).map((s) => {
                  const Icon = ICONS[s.id];
                  return (
                    <Card key={s.id} className="flex items-start gap-3.5 p-4">
                      <IconChip
                        tone={
                          s.status === 'up'
                            ? 'success'
                            : s.status === 'pending'
                              ? 'neutral'
                              : 'warning'
                        }
                      >
                        <Icon />
                      </IconChip>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-fg">{s.name}</p>
                          <Badge
                            tone={
                              s.status === 'up'
                                ? 'success'
                                : s.status === 'pending'
                                  ? 'neutral'
                                  : s.status === 'degraded'
                                    ? 'warning'
                                    : 'danger'
                            }
                            size="sm"
                          >
                            <StatusDot tone={TONE[s.status]} className="size-1.5" />
                            {t(`systalink.status.${s.status}`)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[13px] text-muted">
                          {t(`systalink.roles.${s.id}`)}
                        </p>
                        <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-subtle">
                          <span className="font-mono">{s.detail}</span>
                          {s.latencyMs !== null && (
                            <span>
                              {t('systalink.latency')} ·{' '}
                              <span className="font-semibold tabular text-fg">
                                {s.latencyMs} ms
                              </span>
                            </span>
                          )}
                          <span>
                            {t('systalink.checked', { time: relativeTime(s.checkedAt, lang) })}
                          </span>
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
          <UptimeHistory />
          <Ecosystem />
        </>
      )}
    </Page>
  );
}

/** Seuils de couleur d'une journée : 99 % et plus vert, 95 % et plus orange, en dessous rouge. */
const uptimeTone = (v: number) => (v >= 99 ? 'bg-success' : v >= 95 ? 'bg-warning' : 'bg-danger');

/**
 * Y5 : disponibilité sur 7 jours, une barre par jour (UTC). Un jour sans sonde est dessiné en
 * pointillés et annoncé « pas de mesure » : il ne compte jamais comme 100 %.
 */
function UptimeHistory() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data } = useQuery('status:history:7', () => api.getStatusHistory(7));
  if (!data) return null;
  const pct = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  const day = new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' });
  const full = new Intl.DateTimeFormat(lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const value = (v: number | null) =>
    v === null ? t('systalink.history.noData') : `${pct.format(v)} %`;

  return (
    <section className="mt-8">
      <h2 className="label-caps">{t('systalink.history.title', { count: data.days })}</h2>
      <p className="mt-1 mb-3 text-[13px] text-muted">{t('systalink.history.text')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.services.map((s) => (
          <ServiceHistory
            key={s.id}
            service={s}
            value={value}
            dayLabel={(d) => day.format(new Date(`${d}T00:00:00Z`))}
            fullLabel={(d) => full.format(new Date(`${d}T00:00:00Z`))}
          />
        ))}
      </div>
    </section>
  );
}

function ServiceHistory({
  service: s,
  value,
  dayLabel,
  fullLabel,
}: {
  service: StatusHistory['services'][number];
  value: (v: number | null) => string;
  dayLabel: (date: string) => string;
  fullLabel: (date: string) => string;
}) {
  const { t } = useTranslation();
  const Icon = ICONS[s.id];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-fg">
          <Icon className="size-4 text-muted" />
          {t(`systalink.history.names.${s.id}`, { defaultValue: s.name })}
        </p>
        <p className="text-sm tabular text-fg">
          <span className="sr-only">{t('systalink.history.week')} : </span>
          {value(s.uptimePercent)}
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label={t('systalink.history.daily')}>
        {s.daily.map((d) => {
          const label = `${fullLabel(d.date)} : ${value(d.uptimePercent)}${
            d.uptimePercent === null
              ? ''
              : ` (${t('systalink.history.checks', { count: d.checks })})`
          }`;
          return (
            <li key={d.date} className="flex flex-col items-center gap-1" title={label}>
              <span className="sr-only">{label}</span>
              <div
                aria-hidden
                className={cn(
                  'relative flex h-14 w-full items-end overflow-hidden rounded-[6px]',
                  d.uptimePercent === null
                    ? 'border border-dashed border-line-strong'
                    : 'bg-surface-2',
                )}
              >
                {d.uptimePercent !== null && (
                  <div
                    className={cn('w-full rounded-[6px]', uptimeTone(d.uptimePercent))}
                    style={{ height: `${Math.max(d.uptimePercent, 4)}%` }}
                  />
                )}
              </div>
              <span aria-hidden className="text-[11px] text-subtle">
                {dayLabel(d.date)}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/** Idées A et B : ce que DevHub apporte à Systalink, mesuré en direct. */
function Ecosystem() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data } = useQuery('systalink:ecosystem', () => api.getEcosystem());
  if (!data) return null;
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="label-caps">{t('systalink.ecosystemTitle')}</h2>
          <p className="mt-1 text-[13px] text-muted">{t('systalink.ecosystemText')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeployToSystalink from="systalink" variant="primary" />
          <DeployToSystalink from="systalink" to="orion" />
          <Link
            to="/systalink/aide"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[13px] font-semibold text-fg hover:bg-surface-2"
          >
            <LifeBuoy className="size-4" />
            {t('systalinkHelp.link')}
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-[13px] text-muted">{t('systalink.roomsOnSystalink')}</p>
          <p className="mt-1 text-[28px] font-semibold tabular text-fg">{data.roomsOnSystalink}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-muted">{t('systalink.referrals')}</p>
          <p className="mt-1 text-[28px] font-semibold tabular text-fg">{data.referrals.total}</p>
          <p className="text-xs text-subtle">
            {t('systalink.referrals30', { count: data.referrals.last30Days })}
          </p>
        </Card>
      </div>
      <h3 className="label-caps mt-6 mb-3">{t('systalink.showcase')}</h3>
      {data.showcase.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          {t('systalink.showcaseEmpty')}
        </p>
      ) : (
        <div className="dh-stagger grid gap-3 sm:grid-cols-2">
          {data.showcase.map((r) => (
            <Card key={r.code} className="flex items-start gap-3.5 p-4">
              <IconChip tone="success">
                <Rocket />
              </IconChip>
              <div className="min-w-0 flex-1">
                <Link to={`/p/${r.code}`} className="font-semibold text-fg hover:underline">
                  {r.name}
                </Link>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-mono text-xs text-blue-text hover:underline"
                >
                  {r.url}
                </a>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-subtle">
                  {r.uptime !== null && (
                    <span>
                      {t('systalink.uptime', { value: Math.round(r.uptime * 1000) / 10 })}
                    </span>
                  )}
                  <span>{t('systalink.checked', { time: relativeTime(r.verifiedAt, lang) })}</span>
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
