import { Ban, CheckCircle2, EyeOff, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/djeli';
import { errorText, PageHeader, UserLink } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { formatDate, relativeTime, useLang } from '@/i18n';
import { invalidate, useQuery } from '@/lib/query';
import { requireNetwork } from '@/offline/network';
import { api, type AuditEntry } from '@/services';
import { useSession } from '@/stores/app';
import { ListSkeleton } from './_skeleton';
import { Page } from './_layout';

/** M1 : file de modération, retrait effectif immédiat ; M4 : journal des décisions. */
export default function Admin() {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const [tab, setTab] = useState<'reports' | 'audit'>('reports');

  if (!me?.isAdmin)
    return (
      <Page>
        <EmptyState pose="laptop" title={t('admin.forbidden')} />
      </Page>
    );

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title={t('admin.title')}
        subtitle={tab === 'reports' ? t('admin.subtitle') : t('admin.audit.subtitle')}
      />
      <Segmented
        label={t('admin.title')}
        value={tab}
        onChange={setTab}
        className="mt-5"
        items={[
          { value: 'reports', label: t('admin.tabs.reports') },
          { value: 'audit', label: t('admin.tabs.audit') },
        ]}
      />
      <div className="mt-6">{tab === 'reports' ? <Reports /> : <AuditLog />}</div>
    </Page>
  );
}

function Reports() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, error, refresh } = useQuery('reports', () => api.listReports());

  const handle = async (id: string, remove: boolean) => {
    try {
      requireNetwork();
      await api.handleReport(id, remove);
      invalidate('');
      toast.success(remove ? t('admin.removed') : t('admin.dismissed'));
    } catch (e) {
      toast.error(errorText(t, e));
    }
  };

  if (error) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return <ListSkeleton rows={3} />;
  if (data.length === 0) return <EmptyState pose="celebrate" title={t('admin.empty')} />;
  return (
    <ul className="dh-stagger flex flex-col gap-3">
      {data.map((r) => (
        <li key={r.id}>
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    r.status === 'open' ? 'warning' : r.status === 'removed' ? 'danger' : 'neutral'
                  }
                  size="sm"
                >
                  {t(`admin.status.${r.status}`)}
                </Badge>
                <span className="text-xs text-subtle">{t(`admin.target.${r.targetType}`)}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 font-medium text-fg">{r.targetLabel}</p>
              <p className="mt-1 text-sm text-muted">« {r.reason} »</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                <ShieldCheck className="size-3.5" />
                <UserLink user={r.reporter} size={16} />
                {relativeTime(r.createdAt, lang)}
              </p>
              {r.status === 'open' && r.targetType === 'user' && (
                <p className="mt-1.5 text-xs text-subtle">{t('admin.accountHint')}</p>
              )}
            </div>
            {r.status === 'open' ? (
              <div className="flex gap-2">
                {/* Un compte n'est pas un contenu : l'API refuse de le masquer (BUG-036). */}
                {r.targetType !== 'user' && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 />}
                    onClick={() => handle(r.id, true)}
                  >
                    {t('admin.remove')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Ban />}
                  onClick={() => handle(r.id, false)}
                >
                  {t('admin.dismiss')}
                </Button>
              </div>
            ) : (
              <CheckCircle2 className="size-5 text-success" />
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}

const ACTION_ICON = { hide: EyeOff, restore: RotateCcw, dismiss: Ban };
const ACTION_TONE = { hide: 'danger', restore: 'success', dismiss: 'neutral' } as const;

function AuditLog() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, error, refresh } = useQuery('admin:audit', () => api.listAudit());
  // Pages suivantes, ajoutées au clic sur « Voir plus » (curseur de l'API).
  const [more, setMore] = useState<{ entries: AuditEntry[]; next: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  if (error) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return <ListSkeleton rows={4} />;
  const entries = [...data.entries, ...(more?.entries ?? [])];
  const next = more ? more.next : data.next;
  if (entries.length === 0) return <EmptyState pose="laptop" title={t('admin.audit.empty')} />;

  const loadMore = async () => {
    if (!next) return;
    setLoading(true);
    try {
      const page = await api.listAudit(next);
      setMore((m) => ({ entries: [...(m?.entries ?? []), ...page.entries], next: page.next }));
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col divide-y divide-line rounded-[10px] border border-line bg-surface-1">
        {entries.map((e) => {
          const Icon = ACTION_ICON[e.action];
          return (
            <li key={e.id} className="flex gap-3 p-4">
              <Icon className="mt-0.5 size-4 shrink-0 text-subtle" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ACTION_TONE[e.action]} size="sm">
                    {t(`admin.audit.action.${e.action}`)}
                  </Badge>
                  <span className="text-xs text-subtle">{t(`admin.target.${e.targetType}`)}</span>
                  <time
                    dateTime={e.createdAt}
                    title={formatDate(e.createdAt, lang, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    className="ml-auto text-xs text-subtle"
                  >
                    {relativeTime(e.createdAt, lang)}
                  </time>
                </div>
                <p className="mt-1.5 text-sm text-fg">« {e.reason} »</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                  {t('admin.audit.by')} <UserLink user={e.admin} size={16} />
                  <span className="font-mono text-[11px]">{e.targetId.slice(0, 8)}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {next && (
        <Button variant="secondary" loading={loading} onClick={loadMore} className="self-center">
          {t('admin.audit.more')}
        </Button>
      )}
    </div>
  );
}
