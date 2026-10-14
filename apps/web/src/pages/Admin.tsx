import { Ban, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/djeli';
import { errorText, PageHeader, UserLink } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/primitives';
import { relativeTime, useLang } from '@/i18n';
import { invalidate, useQuery } from '@/lib/query';
import { requireNetwork } from '@/offline/network';
import { api } from '@/services';
import { useSession } from '@/stores/app';
import { ListSkeleton } from './_skeleton';
import { Page } from './_layout';

/** M1 : file de modération, retrait effectif immédiat. */
export default function Admin() {
  const { t } = useTranslation();
  const lang = useLang();
  const me = useSession((s) => s.user);
  const { data, error, refresh } = useQuery(me?.isAdmin ? 'reports' : null, () =>
    api.listReports(),
  );

  if (!me?.isAdmin)
    return (
      <Page>
        <EmptyState pose="laptop" title={t('admin.forbidden')} />
      </Page>
    );

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

  return (
    <Page className="max-w-4xl">
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      <div className="mt-6">
        {error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : !data ? (
          <ListSkeleton rows={3} />
        ) : data.length === 0 ? (
          <EmptyState pose="celebrate" title={t('admin.empty')} />
        ) : (
          <ul className="dh-stagger flex flex-col gap-3">
            {data.map((r) => (
              <Card key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        r.status === 'open'
                          ? 'warning'
                          : r.status === 'removed'
                            ? 'danger'
                            : 'neutral'
                      }
                      size="sm"
                    >
                      {t(`admin.status.${r.status}`)}
                    </Badge>
                    <span className="text-xs uppercase text-subtle">{r.targetType}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 font-medium text-fg">{r.targetLabel}</p>
                  <p className="mt-1 text-sm text-muted">« {r.reason} »</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                    <ShieldCheck className="size-3.5" />
                    <UserLink user={r.reporter} size={16} />
                    {relativeTime(r.createdAt, lang)}
                  </p>
                </div>
                {r.status === 'open' ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 />}
                      onClick={() => handle(r.id, true)}
                    >
                      {t('admin.remove')}
                    </Button>
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
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
