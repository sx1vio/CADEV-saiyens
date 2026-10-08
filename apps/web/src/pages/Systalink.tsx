import {
  CloudUpload,
  Database,
  HardDrive,
  Info,
  Mail,
  RefreshCw,
  Server,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/components/djeli';
import { PageHeader } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Badge, Card, IconChip, Skeleton, StatusDot } from '@/components/ui/primitives';
import { relativeTime, useLang } from '@/i18n';
import { useQuery } from '@/lib/query';
import { api, type ServiceStatus } from '@/services';
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
        </>
      )}
    </Page>
  );
}
